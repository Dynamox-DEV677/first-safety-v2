import { readLS, writeLS } from '../hooks/useLocalStorage'
import voiceWorkerUrl from './voice.worker.ts?worker&url'

/**
 * Voice input, main-thread side. Whisper tiny (English) runs on the phone in a worker.
 *
 * Two rules the rest of the app relies on:
 * 1. Nothing waits for voice. The model installs itself once, in the background, after the app is
 *    saved for offline (`autoInstallVoice`). Darshan decided this on 4 Oct 2026: someone who cannot
 *    see the buttons must be able to speak without first finding Settings. The emergency screens
 *    never start or wait on a download: `isVoiceReady()` only inspects the caches, they show the
 *    buttons until it says yes, and the mic appears the moment it does.
 * 2. Voice never replaces the buttons. It pre-fills the same taps, and the patient confirms them.
 */
export const VOICE_KEY = 'fs.voice'
/** false once someone stops or removes voice on this phone: it never downloads by itself again there. */
export const VOICE_AUTO_KEY = 'fs.voiceAuto'
export const VOICE_MODEL = 'Xenova/whisper-tiny.en'
/** Model (about 41 MB) plus the speech runtime (about 28 MB), fetched once. */
export const VOICE_DOWNLOAD_MB = 70
export const MAX_RECORD_SECONDS = 10
/** Service-worker runtime cache that keeps the worker script itself (see vite.config.ts). */
const RUNTIME_CACHE = 'fs-voice'
/** Longest a transcription may take before the screen gives up and points at the buttons. */
const TRANSCRIBE_TIMEOUT_MS = 90_000

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
    // The worker script is loaded by the browser, not by transformers.js, so the service worker keeps
    // it. Check this build's exact file: after an app update the old one is no use offline.
    if (!names.includes(RUNTIME_CACHE)) return false
    const runtime = await caches.open(RUNTIME_CACHE)
    return !!(await runtime.match(new URL(voiceWorkerUrl, location.href).href))
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
  worker ??= new Worker(voiceWorkerUrl, { type: 'module' })
  return worker
}

/** A worker that failed or hung is thrown away, so the next try starts fresh instead of waiting on it. */
function dropWorker(w: Worker): void {
  w.terminate()
  if (worker === w) worker = null
}

function request<T extends WorkerMsg['type']>(
  post: object,
  want: T,
  onProgress?: (p: Progress) => void,
  transfer: Transferable[] = [],
  timeoutMs = 0,
): Promise<Extract<WorkerMsg, { type: T }>> {
  return new Promise((resolve, reject) => {
    const w = getWorker()
    let timer = 0
    const cleanup = () => {
      w.removeEventListener('message', onMessage)
      w.removeEventListener('error', onError)
      window.clearTimeout(timer)
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
      dropWorker(w)
      reject(new Error(e.message || 'voice worker failed'))
    }
    w.addEventListener('message', onMessage)
    w.addEventListener('error', onError)
    if (timeoutMs) {
      timer = window.setTimeout(() => {
        cleanup()
        dropWorker(w)
        reject(new Error('voice timed out'))
      }, timeoutMs)
    }
    w.postMessage(post, transfer)
  })
}

/** Downloads the model and runtime (or loads them from the cache), reporting progress. */
async function prepareVoice(onProgress: (p: Progress) => void): Promise<void> {
  await request({ type: 'prepare' }, 'ready', onProgress)
  writeLS<VoiceState>(VOICE_KEY, { preparedAt: new Date().toISOString() })
}

export type InstallPhase = 'idle' | 'downloading' | 'ready' | 'error'

export interface InstallState {
  phase: InstallPhase
  progress: Progress | null
  error: '' | 'network' | 'not-kept' | 'failed'
}

let install: InstallState = { phase: 'idle', progress: null, error: '' }
const watchers = new Set<(s: InstallState) => void>()

function setInstall(patch: Partial<InstallState>): void {
  install = { ...install, ...patch }
  watchers.forEach((w) => w(install))
}

/** The one shared download, as Settings, the LEARN card and the emergency screen all see it. */
export function getVoiceInstall(): InstallState {
  return install
}

export function onVoiceInstall(watch: (s: InstallState) => void): () => void {
  watchers.add(watch)
  return () => {
    watchers.delete(watch)
  }
}

let inflight: Promise<boolean> | null = null
/** Bumped by stop and remove, so a download they cancelled can never report back. */
let run = 0

/** Downloads voice once, however many screens ask. Resolves true when every file is kept offline. */
export function installVoice(): Promise<boolean> {
  if (inflight) return inflight
  const mine = ++run
  const current = () => mine === run
  inflight = (async () => {
    setInstall({ phase: 'downloading', progress: null, error: '' })
    try {
      await prepareVoice((progress) => current() && setInstall({ progress }))
      const ok = await isVoiceReady()
      if (current()) setInstall(ok ? { phase: 'ready', progress: null } : { phase: 'error', progress: null, error: 'not-kept' })
      return ok
    } catch (e) {
      const network = !navigator.onLine || (e instanceof Error && /network|fetch|load/i.test(e.message))
      if (current()) setInstall({ phase: 'error', progress: null, error: network ? 'network' : 'failed' })
      return false
    } finally {
      if (current()) inflight = null
    }
  })()
  return inflight
}

function cancel(): void {
  writeLS(VOICE_AUTO_KEY, false)
  run++
  inflight = null
  if (worker) dropWorker(worker)
}

/** Stops a download in progress and keeps voice from downloading by itself on this phone again. */
export function stopVoiceInstall(): void {
  cancel()
  setInstall({ phase: 'idle', progress: null, error: '' })
}

let autoStarted = false

/**
 * Starts the one-time voice download by itself (rule 1 above). Waits until the service worker
 * controls the page, so the app is saved for offline first and the worker script is kept on its way
 * through, then pauses briefly so the first screen never competes with it. Does nothing if voice is
 * already here, or if someone stopped or removed it on this phone. Without a connection it tries
 * again when one comes back.
 */
export async function autoInstallVoice(): Promise<void> {
  if (autoStarted) return
  autoStarted = true
  try {
    if (!voiceSupported() || !('serviceWorker' in navigator)) return
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
        window.setTimeout(resolve, 20_000)
      })
    }
    if (!navigator.serviceWorker.controller) return
    await new Promise((r) => window.setTimeout(r, 1500))
    if (await isVoiceReady()) {
      if (install.phase === 'idle') setInstall({ phase: 'ready' })
      return
    }
    if (readLS<boolean>(VOICE_AUTO_KEY, true) === false) return
    if (!navigator.onLine || !(await installVoice())) {
      window.addEventListener(
        'online',
        () => {
          autoStarted = false
          void autoInstallVoice()
        },
        { once: true },
      )
    }
  } catch {
    // voice is an accelerator; the buttons are always there
  }
}

/** Loads the cached model in the background so the first tap answers faster. Call only when ready. */
export function warmVoice(): void {
  request({ type: 'prepare' }, 'ready').catch(() => {
    // the tap path is always there
  })
}

/** Deletes every voice file and keeps voice from downloading by itself on this phone again. */
export async function removeVoice(): Promise<void> {
  cancel()
  const names = await caches.keys()
  await Promise.all(names.filter((n) => /transformers/i.test(n) || n === RUNTIME_CACHE).map((n) => caches.delete(n)))
  writeLS(VOICE_KEY, null)
  setInstall({ phase: 'idle', progress: null, error: '' })
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
  const m = await request({ type: 'transcribe', audio }, 'result', undefined, [audio.buffer], TRANSCRIBE_TIMEOUT_MS)
  return m.text
}
