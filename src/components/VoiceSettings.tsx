import { useEffect, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  VOICE_DOWNLOAD_MB,
  VOICE_KEY,
  isVoiceReady,
  prepareVoice,
  removeVoice,
  voiceSupported,
  type Progress,
  type VoiceState,
} from '../voice'

type Phase = 'checking' | 'unsupported' | 'not-ready' | 'preparing' | 'ready' | 'error'

/** Best guess at "this download would use mobile data" - Android Chrome exposes it, others don't. */
function onMobileData(): boolean {
  const c = (navigator as Navigator & { connection?: { type?: string; saveData?: boolean } }).connection
  return !!c && (c.type === 'cellular' || c.saveData === true)
}

/**
 * The only place voice files are ever downloaded: one explicit tap, size stated up front, meant
 * for a calm moment on Wi-Fi. Everything it fetches is kept on the phone for offline use.
 */
export default function VoiceSettings() {
  const [phase, setPhase] = useState<Phase>('checking')
  const [prog, setProg] = useState<Progress | null>(null)
  const [error, setError] = useState('')
  const [state] = useLocalStorage<VoiceState | null>(VOICE_KEY, null)

  useEffect(() => {
    let alive = true
    if (!voiceSupported()) {
      setPhase('unsupported')
      return
    }
    isVoiceReady().then((ok) => alive && setPhase(ok ? 'ready' : 'not-ready'))
    return () => {
      alive = false
    }
  }, [])

  const prepare = async () => {
    setPhase('preparing')
    setProg(null)
    setError('')
    try {
      await prepareVoice(setProg)
      if (await isVoiceReady()) {
        setPhase('ready')
      } else {
        setError('Downloaded, but the files were not kept for offline use. Try once more on Wi-Fi.')
        setPhase('error')
      }
    } catch (e) {
      setError(e instanceof Error && /network|fetch|load/i.test(e.message) ? 'The download did not finish. Check the connection and try again.' : 'Voice could not be set up on this phone.')
      setPhase('error')
    }
  }

  const remove = async () => {
    if (!window.confirm('Remove the voice files from this phone? You can download them again later.')) return
    await removeVoice()
    setPhase('not-ready')
  }

  if (phase === 'checking') return <p className="small">Checking…</p>
  if (phase === 'unsupported') return <p className="body">Voice input is not available on this browser.</p>

  if (phase === 'preparing') {
    const pct = prog ? Math.round(prog.pct) : 0
    const file = prog?.file ? prog.file.split('/').pop() : ''
    return (
      <div data-voice-settings="preparing" role="status" aria-live="polite">
        <p className="body" style={{ marginBottom: 0 }}>
          Downloading… {file ? `${file} ${pct}%` : 'starting'}
        </p>
        <div className="prog-bar" aria-hidden="true">
          <div className="prog-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="small">Keep the app open. This happens once.</p>
      </div>
    )
  }

  if (phase === 'ready') {
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

  return (
    <div data-voice-settings={phase}>
      {phase === 'error' && (
        <p className="body" role="alert">
          {error}
        </p>
      )}
      {onMobileData() && (
        <p className="body" role="note">
          <b>You seem to be on mobile data.</b> This uses about {VOICE_DOWNLOAD_MB} MB of it. Wi-Fi is better.
        </p>
      )}
      <button type="button" className="btn btn-solid" onClick={prepare}>
        Download voice input · about {VOICE_DOWNLOAD_MB} MB
      </button>
      <p className="small" style={{ marginTop: 10 }}>
        Do this once, on Wi-Fi, before you need it. Nothing downloads during an emergency: until this is done, the
        emergency screens simply show the buttons.
      </p>
    </div>
  )
}
