import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ANIMAL_LABEL, contactLabel, siteLabel, type Animal, type BiteRecord } from '../data/bite'
import { navigate } from '../hooks/useRoute'
import { updateBiteRecord } from '../hooks/useBiteRecord'
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
import { askOnlineMatcher, onlineMatchEnabled } from '../voice/online'

type Phase = 'checking' | 'no-voice' | 'not-ready' | 'ready' | 'recording' | 'working' | 'done' | 'error'

interface Props {
  /** The words named a snake, insect or spider: the picker shows its out-of-scope notice. */
  onNotMammal: () => void
}

/**
 * "Speak instead" / "Type instead". Sits above the animal buttons and never replaces them (§9).
 *
 * If the speech model is not on the phone, nothing downloads and nothing spins: one line says so
 * and the tap list is right there. Typing works with no model at all. Whatever is said or typed goes
 * through the offline matcher; if that is not sure and the person turned on online help, the online
 * matcher gets 2.5 seconds; otherwise the tap list is narrowed to the likeliest options. The words
 * are always shown back, so a mishearing can be seen and corrected.
 */
export default function VoiceInput({ onNotMammal }: Props) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [seconds, setSeconds] = useState(0)
  const [heard, setHeard] = useState('')
  const [match, setMatch] = useState<VoiceMatch | null>(null)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<'mic' | 'model' | ''>('')
  const [voiceOk, setVoiceOk] = useState(false)
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
      setPhase('no-voice')
      return
    }
    isVoiceReady().then((ok) => {
      if (!alive) return
      setVoiceOk(ok)
      setPhase(ok ? 'ready' : 'not-ready')
      if (ok) warmVoice()
    })
    return () => {
      alive = false
      clearTimers()
      rec.current?.cancel()
    }
  }, [])

  const idlePhase = (): Phase => (voiceOk ? 'ready' : voiceSupported() ? 'not-ready' : 'no-voice')

  /** Words in, taps out. The same path for speech and typing. */
  const handle = async (text: string) => {
    setHeard(text)
    let m = matchTranscript(text)
    if (!m.confident && !m.atClinic && text.trim()) {
      setPhase('working')
      const online = await askOnlineMatcher(text)
      if (online) {
        m = {
          ...m,
          animal: online.animal,
          candidates: [],
          confident: true,
          site: m.site ?? online.site,
          brokeSkin: m.brokeSkin ?? online.brokeSkin,
        }
      }
    }
    const patch: Partial<BiteRecord> = {}
    if (m.animal) patch.animal = m.animal
    if (m.site) patch.site = m.site
    if (m.contact.length) patch.contact = m.contact
    if (m.brokeSkin !== null) patch.brokeSkin = m.brokeSkin ? 'yes' : 'no'
    if (m.bleeding !== null) patch.bleeding = m.bleeding ? 'yes' : 'no'
    if (Object.keys(patch).length) updateBiteRecord(patch)
    setMatch(m)
    if (m.notMammal) onNotMammal()
    setPhase('done')
    if (m.atClinic) navigate('/report')
  }

  const finish = async () => {
    const r = rec.current
    if (!r) return
    rec.current = null
    clearTimers()
    setPhase('working')
    try {
      const blob = await r.stop()
      const text = await transcribeSamples(await blobToSamples(blob))
      await handle(text)
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

  const submitTyped = (e: FormEvent) => {
    e.preventDefault()
    const text = typed.trim()
    if (text) void handle(text)
  }

  const reset = () => {
    setHeard('')
    setMatch(null)
    setTyped('')
    setPhase(idlePhase())
  }

  const pickCandidate = (a: Animal) => {
    updateBiteRecord({ animal: a })
    navigate(match?.site ? '/now/details' : '/now/area')
  }

  if (phase === 'checking') return null

  const typeBox = (
    <form className="type-box" onSubmit={submitTyped}>
      <label className="lbl" htmlFor="what-happened">
        Or type what happened
      </label>
      <div className="btn-row">
        <input
          id="what-happened"
          className="inp"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="e.g. street dog bit my hand"
          autoComplete="off"
          maxLength={300}
        />
        <button type="submit" className="btn btn-solid type-go" disabled={!typed.trim()}>
          Use
        </button>
      </div>
      {onlineMatchEnabled() && (
        <p className="small" style={{ marginTop: 8 }}>
          If the app can&rsquo;t tell what you mean, just these words may be checked online. Settings &rarr; Online help.
        </p>
      )}
    </form>
  )

  if (phase === 'no-voice' || phase === 'not-ready') {
    return (
      <div className="voice" data-voice={phase}>
        {phase === 'not-ready' && <p className="voice-note">Voice needs a one-time download. Tap answers for now.</p>}
        {typeBox}
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
            <small>Say what happened, up to {MAX_RECORD_SECONDS} seconds</small>
          </span>
        </button>
        <p className="small">Audio stays on this phone. Or tap the buttons below.</p>
        {typeBox}
      </div>
    )
  }

  if (phase === 'recording') {
    return (
      <div className="voice" data-voice="recording">
        <button type="button" className="btn btn-solid voice-btn rec-on" onClick={() => void finish()}>
          <span className="ico pulse" aria-hidden="true">
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
            <small>A few seconds on this phone. Or tap the buttons below.</small>
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
        {typeBox}
      </div>
    )
  }

  // done
  const chips = match
    ? [
        match.animal ? ANIMAL_LABEL[match.animal] : '',
        match.site ? siteLabel(match.site) : '',
        ...match.contact.map(contactLabel),
        match.brokeSkin === null ? '' : match.brokeSkin ? 'Skin broken' : 'Skin not broken',
        match.bleeding === null ? '' : match.bleeding ? 'Bleeding' : 'Not bleeding',
      ].filter(Boolean)
    : []
  return (
    <div className="voice-card" data-voice="done" role="status">
      <p className="eyebrow">Heard</p>
      <p className="voice-heard">{heard ? `“${heard}”` : 'Nothing clear.'}</p>
      {chips.length > 0 && (
        <div className="chips" aria-label="Filled in from your words">
          {chips.map((c) => (
            <span className="chip" key={c}>
              {c}
            </span>
          ))}
        </div>
      )}
      {match?.confident ? (
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={reset}>
            Try again
          </button>
          <button type="button" className="btn btn-solid" onClick={() => navigate(match.site ? '/now/details' : '/now/area')}>
            Looks right
          </button>
        </div>
      ) : match && match.candidates.length > 1 ? (
        <>
          <p className="body">Which one was it?</p>
          <div className="grid2" data-voice="candidates">
            {match.candidates.map((a) => (
              <button key={a} type="button" className="btn" onClick={() => pickCandidate(a)}>
                {ANIMAL_LABEL[a]}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" onClick={reset}>
            Try again
          </button>
        </>
      ) : (
        <>
          <p className="body">Tap the animal below.</p>
          <button type="button" className="btn btn-ghost" onClick={reset}>
            Try again
          </button>
        </>
      )}
      <p className="small" style={{ marginTop: 10 }}>
        You can change any of this on the next screens.
      </p>
    </div>
  )
}
