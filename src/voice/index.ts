import { writeLS } from '../hooks/useLocalStorage'

/**
 * Voice input, main-thread side. Whisper tiny (English) runs on the phone in a worker.
 *
 * Two rules the rest of the app relies on:
 * 1. Nothing downloads on the emergency path. `isVoiceReady()` only inspects the caches, and the
 *    worker is only created when that says every file is already here. The one place files come
 *    from the network is `prepareVoice()`, behind an explicit tap in Settings.
 * 2. Voice never replaces the buttons. It pre-fills the same taps, and the patient confirms them.
 */
export const VOICE_KEY = 'fs.voice'
export const VOICE_MODEL = 'Xenova/whisper-tiny.en'
/** Model (about 41 MB) plus the speech runtime (about 28 MB), fetched once from Settings. */
export const VOICE_DOWNLOAD_MB = 70
export const MAX_RECORD_SECONDS = 10
/** Service-worker runtime cache that keeps the worker script itself (see vite.config.ts). */
const RUNTIME_CACHE = 'fs-voice'

export interface VoiceState {
  preparedAt: string
}

export interface Progress {
  status: string
  file: string
  pct: number
  loaded: number
  total: number
}

export function voiceSupported(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      window.isSecureContext &&
      'MediaRecorder' in window &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof Worker !== 'undefined' &&
      typeof WebAssembly !== 'undefined' &&
      typeof AudioContext !== 'undefined' &&
      'caches' in window
    )
  } catch {
    return false
  }
}

async function cacheUrls(name: string): Promise<string[]> {
  const c = await caches.open(name)
  return (await c.keys()).map((r) => r.url)
}

/** True only when every file voice needs is already on this phone. Never triggers a download. */
export async function isVoiceReady(): Promise<boolean> {
  try {
    const names = await caches.keys()
    const modelCache = names.find((n) => /transformers/i.test(n))
    if (!modelCache) return false
    const model = await cacheUrls(modelCache)
    const has = (suffix: string) => model.some((u) => u.includes(VOICE_MODEL) && u.endsWith(suffix))
    if (!has('encoder_model_quantized.onnx') || !has('decoder_model_merged_quantized.onnx')) return false
    if (!model.some((u) => u.endsWith('.wasm'))) return false
    // the worker script is loaded by the browser, not by transformers.js, so the service worker keeps it
    if (!names.includes(RUNTIME_CACHE)) return false
    const runtime = await cacheUrls(RUNTIME_CACHE)
    return runtime.some((u) => /voice\.worker-[^/]+\.js$/.test(u))
  } catch {
    return false
  }
}

type WorkerMsg =
  | { type: 'progress'; status: string; file: string; progress: number; loaded: number; total: number }
  | { type: 'ready' }
  | { type: 'result'; text: string }
  | { type: 'error'; message: string }

let worker: Worker | null = null

function getWorker(): Worker {
  worker ??= new Worker(new URL('./voice.worker.ts', import.meta.url), { type: 'module' })
  return worker
}

function request<T extends WorkerMsg['type']>(
  post: object,
  want: T,
  onProgress?: (p: Progress) => void,
  transfer: Transferable[] = [],
): Promise<Extract<WorkerMsg, { type: T }>> {
  return new Promise((resolve, reject) => {
    const w = getWorker()
    const cleanup = () => {
      w.removeEventListener('message', onMessage)
      w.removeEventListener('error', onError)
    }
    const onMessage = (e: MessageEvent<WorkerMsg>) => {
      const m = e.data
      if (m.type === 'progress') {
        onProgress?.({ status: m.status, file: m.file, pct: m.progress, loaded: m.loaded, total: m.total })
        return
      }
      cleanup()
      if (m.type === 'error') reject(new Error(m.message))
      else if (m.type === want) resolve(m as Extract<WorkerMsg, { type: T }>)
      else reject(new Error(`unexpected ${m.type}`))
    }
    const onError = (e: ErrorEvent) => {
      cleanup()
      reject(new Error(e.message || 'voice worker failed'))
    }
    w.addEventListener('message', onMessage)
    w.addEventListener('error', onError)
    w.postMessage(post, transfer)
  })
}

/** Settings only. Downloads the model and runtime once, reporting progress, then records readiness. */
export async function prepareVoice(onProgress: (p: Progress) => void): Promise<void> {
  await request({ type: 'prepare' }, 'ready', onProgress)
  writeLS<VoiceState>(VOICE_KEY, { preparedAt: new Date().toISOString() })
}

/** Loads the cached model in the background so the first tap answers faster. Call only when ready. */
export function warmVoice(): void {
  request({ type: 'prepare' }, 'ready').catch(() => {
    // the tap path is always there
  })
}

export async function removeVoice(): Promise<void> {
  worker?.terminate()
  worker = null
  const names = await caches.keys()
  await Promise.all(names.filter((n) => /transformers/i.test(n) || n === RUNTIME_CACHE).map((n) => caches.delete(n)))
  writeLS(VOICE_KEY, null)
}

export interface Recording {
  stop: () => Promise<Blob>
  cancel: () => void
}

/** Asks for the microphone only now, on the patient's tap, and releases it as soon as recording ends. */
export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((m) =>
    MediaRecorder.isTypeSupported(m),
  )
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: Blob[] = []
  rec.addEventListener('dataavailable', (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  })
  const release = () => stream.getTracks().forEach((t) => t.stop())
  const stopped = new Promise<Blob>((resolve) =>
    rec.addEventListener('stop', () => {
      release()
      resolve(new Blob(chunks, { type: rec.mimeType }))
    }),
  )
  rec.start()
  return {
    stop: () => {
      if (rec.state !== 'inactive') rec.stop()
      return stopped
    },
    cancel: () => {
      try {
        if (rec.state !== 'inactive') rec.stop()
      } catch {
        // already stopped
      }
      release()
    },
  }
}

/** Decodes whatever the recorder produced into 16 kHz mono samples, which is what Whisper takes. */
export async function blobToSamples(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext({ sampleRate: 16000 })
  try {
    let buf = await ctx.decodeAudioData(await blob.arrayBuffer())
    if (buf.sampleRate !== 16000) {
      const off = new OfflineAudioContext(1, Math.ceil(buf.duration * 16000), 16000)
      const src = off.createBufferSource()
      src.buffer = buf
      src.connect(off.destination)
      src.start()
      buf = await off.startRendering()
    }
    if (buf.numberOfChannels === 1) return buf.getChannelData(0).slice()
    const out = new Float32Array(buf.length)
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c)
      for (let i = 0; i < d.length; i++) out[i] += d[i] / buf.numberOfChannels
    }
    return out
  } finally {
    await ctx.close()
  }
}

export async function transcribeSamples(audio: Float32Array): Promise<string> {
  const m = await request({ type: 'transcribe', audio }, 'result', undefined, [audio.buffer])
  return m.text
}
