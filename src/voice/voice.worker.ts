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

// Never look for models on this origin (no /models folder), always keep downloads in the
// browser's Cache API so the second load is offline.
env.allowLocalModels = false
env.useBrowserCache = true

// The ONNX runtime ships with the app (Vite emits these two files next to this worker) instead of
// coming from a CDN, so the only third party voice ever talks to is the model host, once.
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

function load(report: boolean): Promise<Transcriber> {
  transcriber ??= pipeline('automatic-speech-recognition', VOICE_MODEL, {
    device: 'wasm',
    dtype: 'q8',
    progress_callback: report
      ? (p: Progress) => self.postMessage({ type: 'progress', status: p.status ?? '', file: p.file ?? '', progress: p.progress ?? 0, loaded: p.loaded ?? 0, total: p.total ?? 0 })
      : undefined,
  }).then((p) => p as unknown as Transcriber)
  transcriber.catch(() => {
    transcriber = null
  })
  return transcriber
}

self.addEventListener('message', async (e: MessageEvent) => {
  const msg = e.data as { type: 'prepare' } | { type: 'transcribe'; audio: Float32Array }
  try {
    if (msg.type === 'prepare') {
      await load(true)
      self.postMessage({ type: 'ready' })
    } else if (msg.type === 'transcribe') {
      const asr = await load(false)
      const out = await asr(msg.audio)
      self.postMessage({ type: 'result', text: (out.text ?? '').trim() })
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
})
