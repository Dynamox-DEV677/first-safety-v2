import { useEffect, useRef, useState } from 'react'
import { ANIMAL_LABEL, areaLabel, contactLabel } from '../data/bite'
import { href, navigate } from '../hooks/useRoute'
import { updateBiteRecord } from '../hooks/useBiteRecord'
import type { BiteRecord } from '../data/bite'
import {
  MAX_RECORD_SECONDS,
  blobToSamples,
  isVoiceReady,
  startRecording,
  transcribeSamples,
  voiceSupported,
  warmVoice,
  type Recording,
} from '../voice'
import { matchTranscript, type VoiceMatch } from '../voice/match'

type Phase = 'checking' | 'unsupported' | 'not-ready' | 'ready' | 'recording' | 'working' | 'done' | 'error'

interface Props {
  /** The transcript named a snake, insect or spider: the picker shows its out-of-scope notice. */
  onNotMammal: () => void
}

/**
 * "Speak instead". Sits above the animal buttons and never replaces them.
 *
 * If the model is not on the phone, the button says so and points to Settings - it does not
 * download anything, because this screen is reached during an emergency. When it is ready, one
 * tap records up to ten seconds, the phone transcribes it locally, and the words pre-fill the same
 * taps the patient could have made. Every one of them is shown back for confirmation.
 */
export default function VoiceInput({ onNotMammal }: Props) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [seconds, setSeconds] = useState(0)
  const [heard, setHeard] = useState('')
  const [match, setMatch] = useState<VoiceMatch | null>(null)
  const [error, setError] = useState<'mic' | 'model' | ''>('')
  const rec = useRef<Recording | null>(null)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => {
      window.clearTimeout(t)
      window.clearInterval(t)
    })
    timers.current = []
  }

  useEffect(() => {
    let alive = true
    if (!voiceSupported()) {
      setPhase('unsupported')
      return
    }
    isVoiceReady().then((ok) => {
      if (!alive) return
      setPhase(ok ? 'ready' : 'not-ready')
      if (ok) warmVoice()
    })
    return () => {
      alive = false
      clearTimers()
      rec.current?.cancel()
    }
  }, [])

  const finish = async () => {
    const r = rec.current
    if (!r) return
    rec.current = null
    clearTimers()
    setPhase('working')
    try {
      const blob = await r.stop()
      const text = await transcribeSamples(await blobToSamples(blob))
      const m = matchTranscript(text)
      setHeard(text)
      setMatch(m)
      const patch: Partial<BiteRecord> = {}
      if (m.animal) patch.animal = m.animal
      if (m.areas.length) patch.areas = m.areas
      if (m.contact.length) patch.contact = m.contact
      if (Object.keys(patch).length) updateBiteRecord(patch)
      if (m.notMammal) onNotMammal()
      setPhase('done')
    } catch {
      setError('model')
      setPhase('error')
    }
  }

  const start = async () => {
    try {
      setError('')
      setSeconds(0)
      rec.current = await startRecording()
      setPhase('recording')
      const t0 = Date.now()
      timers.current.push(
        window.setInterval(() => setSeconds(Math.min(MAX_RECORD_SECONDS, Math.round((Date.now() - t0) / 1000))), 250),
        window.setTimeout(() => void finish(), MAX_RECORD_SECONDS * 1000),
      )
    } catch {
      setError('mic')
      setPhase('error')
    }
  }

  const reset = () => {
    setHeard('')
    setMatch(null)
    setPhase('ready')
  }

  if (phase === 'checking' || phase === 'unsupported') return null

  if (phase === 'not-ready') {
    return (
      <div className="voice" data-voice="not-ready">
        <button type="button" className="btn voice-btn" disabled>
          <span className="ico" aria-hidden="true">
            🎙
          </span>
          <span>
            <b>Voice not set up</b>
            <small>Use the buttons below</small>
          </span>
        </button>
        <p className="small">
          Set it up in <a href={href('/settings')}>Settings</a> when you have Wi-Fi. Nothing downloads during an
          emergency.
        </p>
      </div>
    )
  }

  if (phase === 'ready') {
    return (
      <div className="voice" data-voice="ready">
        <button type="button" className="btn voice-btn" onClick={start}>
          <span className="ico" aria-hidden="true">
            🎙
          </span>
          <span>
            <b>Speak instead</b>
            <small>Say what happened, in English</small>
          </span>
        </button>
        <p className="small">Audio stays on this phone. Or tap the buttons below.</p>
      </div>
    )
  }

  if (phase === 'recording') {
    return (
      <div className="voice" data-voice="recording">
        <button type="button" className="btn btn-red voice-btn" onClick={() => void finish()}>
          <span className="ico" aria-hidden="true">
            ●
          </span>
          <span>
            <b>Listening… {seconds}s</b>
            <small>Tap when you have finished</small>
          </span>
        </button>
      </div>
    )
  }

  if (phase === 'working') {
    return (
      <div className="voice" data-voice="working">
        <div className="btn voice-btn" role="status" aria-live="polite">
          <span className="ico" aria-hidden="true">
            …
          </span>
          <span>
            <b>Working out what you said</b>
            <small>A few seconds. Or tap the buttons below.</small>
          </span>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="voice" data-voice="error">
        <p className="body" role="status">
          {error === 'mic' ? 'Could not use the microphone.' : 'Could not work out what you said.'} Use the buttons
          below.
        </p>
        <button type="button" className="btn btn-sm" onClick={reset}>
          Try again
        </button>
      </div>
    )
  }

  // done
  const chips = match
    ? [match.animal ? ANIMAL_LABEL[match.animal] : '', ...match.areas.map(areaLabel), ...match.contact.map(contactLabel)].filter(
        Boolean,
      )
    : []
  return (
    <div className="voice-card" data-voice="done" role="status">
      <p className="eyebrow">Heard</p>
      <p className="voice-heard">{heard ? `“${heard}”` : 'Nothing clear.'}</p>
      {chips.length > 0 ? (
        <div className="chips" aria-label="Filled in from your words">
          {chips.map((c) => (
            <span className="chip" key={c}>
              {c}
            </span>
          ))}
        </div>
      ) : (
        <p className="body">Could not tell what happened from that. Tap the buttons below.</p>
      )}
      {match?.animal ? (
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={reset}>
            Try again
          </button>
          <button type="button" className="btn btn-solid" onClick={() => navigate('/now/area')}>
            Looks right
          </button>
        </div>
      ) : (
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={reset}>
            Try again
          </button>
          <span className="small" style={{ alignSelf: 'center' }}>
            Now tap the animal below.
          </span>
        </div>
      )}
      <p className="small" style={{ marginTop: 10 }}>
        You can change any of this on the next screens.
      </p>
    </div>
  )
}
