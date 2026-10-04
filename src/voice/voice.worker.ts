/**
 * Speech-to-text worker. Runs Whisper tiny (English) entirely on this phone with transformers.js.
 *
 * Created by the one-time background install (after the app is saved for offline), and on the
 * emergency path only once the main thread has checked that every file is already cached. That
 * install is the one time files come from the network.
 *
 * Audio in, text out. No medical logic lives here.
 */
import { env, pipeline } from '@huggingface/transformers'

export const VOICE_MODEL = 'Xenova/whisper-tiny.en'

// The model ships with the app (public/models, pinned and unmodified; see the NOTICE there), so
// voice never talks to a third party: every file comes from this site. Never fall back to the
// Hugging Face hub. Downloads are kept in the browser's Cache API, so the second load is offline.
env.allowLocalModels = true
env.allowRemoteModels = false
env.localModelPath = '/models/'
env.useBrowserCache = true

// The ONNX runtime ships with the app too (Vite emits these two files next to this worker).
// transformers.js fetches both through its cache, so they are offline after the one-time install.
const ortWasm = env.backends.onnx.wasm
if (ortWasm) {
  ortWasm.wasmPaths = {
    wasm: new URL('../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm', import.meta.url).href,
    mjs: new URL('../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs', import.meta.url).href,
  }
}

type Progress = { status?: string; file?: string; progress?: number; loaded?: number; total?: number }
type Transcriber = (audio: Float32Array) => Promise<{ text: string }>

let transcriber: Promise<Transcriber> | null = null

/** Progress goes to the request that started the load; anyone else asking just waits for it. */
function load(progressFor: number | null): Promise<Transcriber> {
  transcriber ??= pipeline('automatic-speech-recognition', VOICE_MODEL, {
    device: 'wasm',
    dtype: 'q8',
    progress_callback:
      progressFor !== null
        ? (p: Progress) => self.postMessage({ id: progressFor, type: 'progress', status: p.status ?? '', file: p.file ?? '', progress: p.progress ?? 0, loaded: p.loaded ?? 0, total: p.total ?? 0 })
        : undefined,
  }).then((p) => p as unknown as Transcriber)
  transcriber.catch(() => {
    transcriber = null
  })
  return transcriber
}

// Every answer carries the id of the request it answers. A warm-up and a transcription can overlap
// (someone taps the mic while the model is still loading), and each must get its own answer.
self.addEventListener('message', async (e: MessageEvent) => {
  const msg = e.data as ({ type: 'prepare' } | { type: 'transcribe'; audio: Float32Array }) & { id: number }
  const id = msg.id
  try {
    if (msg.type === 'prepare') {
      await load(id)
      self.postMessage({ id, type: 'ready' })
    } else if (msg.type === 'transcribe') {
      const asr = await load(null)
      const out = await asr(msg.audio)
      self.postMessage({ id, type: 'result', text: (out.text ?? '').trim() })
    }
  } catch (err) {
    self.postMessage({ id, type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
})
