import { useEffect, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  VOICE_AUTO_KEY,
  VOICE_DOWNLOAD_MB,
  VOICE_KEY,
  getVoiceInstall,
  installVoice,
  isVoiceReady,
  onVoiceInstall,
  removeVoice,
  stopVoiceInstall,
  voiceSupported,
  type VoiceState,
} from '../voice'

/** Best guess at "this download would use mobile data" - Android Chrome exposes it, others don't. */
function onMobileData(): boolean {
  const c = (navigator as Navigator & { connection?: { type?: string; saveData?: boolean } }).connection
  return !!c && (c.type === 'cellular' || c.saveData === true)
}

const ERRORS = {
  network: 'The download did not finish. Check the connection and try again.',
  'not-kept': 'Downloaded, but the files were not kept for offline use. Try once more on Wi-Fi.',
  failed: 'Voice could not be set up on this phone.',
} as const

/**
 * Where voice can be watched and controlled. It downloads by itself (`autoInstallVoice`); this shows
 * that one shared download, stops it, starts it again, or removes the files. Stopping or removing
 * also keeps it from downloading by itself again on this phone.
 */
export default function VoiceSettings() {
  const [install, setInstall] = useState(getVoiceInstall)
  const [cached, setCached] = useState<boolean | null>(null)
  const [auto, setAuto] = useLocalStorage<boolean>(VOICE_AUTO_KEY, true)
  const [state] = useLocalStorage<VoiceState | null>(VOICE_KEY, null)
  const supported = voiceSupported()

  useEffect(() => onVoiceInstall(setInstall), [])

  useEffect(() => {
    let alive = true
    if (supported) isVoiceReady().then((ok) => alive && setCached(ok))
    return () => {
      alive = false
    }
  }, [supported, install.phase])

  const download = () => {
    setAuto(true)
    void installVoice()
  }

  const remove = async () => {
    if (!window.confirm('Remove the voice files from this phone? They will not download again unless you tap Download.')) return
    await removeVoice()
    setCached(false)
  }

  if (!supported) return <p className="body">Voice input is not available on this browser.</p>

  if (install.phase === 'downloading') {
    const prog = install.progress
    const pct = prog ? Math.round(prog.pct) : 0
    const file = prog?.file ? prog.file.split('/').pop() : ''
    return (
      <div data-voice-settings="preparing">
        <p className="body" role="status" style={{ marginBottom: 0 }}>
          Downloading voice input…
        </p>
        <p className="small" style={{ marginTop: 4 }}>
          {file ? `${file} ${pct}%` : 'Starting'}
        </p>
        <div className="prog-bar" aria-hidden="true">
          <div className="prog-fill" style={{ width: `${pct}%` }} />
        </div>
        {onMobileData() && (
          <p className="body" role="note">
            <b>You seem to be on mobile data.</b> This uses about {VOICE_DOWNLOAD_MB} MB of it.
          </p>
        )}
        <p className="small">Happens once, in the background. Keep the app open until it finishes.</p>
        <button type="button" className="btn btn-ghost" onClick={stopVoiceInstall}>
          Stop download
        </button>
      </div>
    )
  }

  if (install.phase === 'ready' || cached) {
    return (
      <div data-voice-settings="ready">
        <p className="body">
          <b>Ready · works offline.</b>
          {state?.preparedAt ? ` Set up ${new Date(state.preparedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.` : ''}
        </p>
        <button type="button" className="btn" onClick={remove}>
          Remove voice files
        </button>
      </div>
    )
  }

  if (cached === null) return <p className="small">Checking…</p>

  return (
    <div data-voice-settings={install.phase === 'error' ? 'error' : 'not-ready'}>
      {install.phase === 'error' && install.error && (
        <p className="body" role="alert">
          {ERRORS[install.error]}
        </p>
      )}
      {onMobileData() && (
        <p className="body" role="note">
          <b>You seem to be on mobile data.</b> This uses about {VOICE_DOWNLOAD_MB} MB of it. Wi-Fi is better.
        </p>
      )}
      <button type="button" className="btn btn-solid" onClick={download}>
        Download voice input · about {VOICE_DOWNLOAD_MB} MB
      </button>
      <p className="small" style={{ marginTop: 10 }}>
        {auto
          ? 'It also downloads by itself, once, whenever the app is open with internet.'
          : 'You stopped or removed voice, so it will not download by itself on this phone.'}{' '}
        Until it is here, the emergency screens show the buttons and a type box.
      </p>
    </div>
  )
}
