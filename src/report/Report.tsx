import { useEffect, useRef, useState } from 'react'
import { helplines } from '../data/nowMode'
import { clearBiteRecord, useBiteRecord } from '../hooks/useBiteRecord'
import { useMedical } from '../hooks/useMedical'
import { useVaccine } from '../hooks/useVaccine'
import { clearWashTimer, useTimer } from '../hooks/useTimer'
import { href, navigate } from '../hooks/useRoute'
import { useLocalStorage, writeLS } from '../hooks/useLocalStorage'
import CallContacts from '../components/CallContacts'
import {
  L,
  buildIncidentRecord,
  day,
  hasContacts,
  hm,
  recordSpeech,
  recordText,
  type Lang,
  type LabelKey,
} from './buildReport'

/**
 * The hospital handover report. Generated fully offline, every time, from what was recorded on this
 * phone. White in both themes, large mono type, no app chrome. Records only; no interpretation.
 * Never uploaded: copy, read aloud and share all start from an explicit tap.
 */
export default function Report() {
  const bite = useBiteRecord()
  const [med] = useMedical()
  const { record: vaccine } = useVaccine()
  const t = useTimer()
  const [lang, setLang] = useLocalStorage<Lang>('fs.reportLang', 'en')
  const [now, setNow] = useState(() => new Date())
  const [msg, setMsg] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [plain, setPlain] = useState(false)
  const plainRef = useRef<HTMLTextAreaElement>(null)

  // "34 minutes ago" keeps counting while the report is open.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  // Stop talking when leaving the screen.
  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  const rec = buildIncidentRecord({
    bite,
    med,
    vaccine,
    liveWashSeconds: t.status === 'idle' ? null : t.elapsed,
    timerRunning: t.status === 'running',
    now,
  })
  const text = () => recordText(buildIncidentRecord({ bite, med, vaccine, liveWashSeconds: t.status === 'idle' ? null : t.elapsed, timerRunning: t.status === 'running', now: new Date() }), lang)

  const copy = async () => {
    const value = text()
    try {
      await navigator.clipboard.writeText(value)
      setMsg('Copied as plain text.')
    } catch {
      setPlain(true)
      setMsg('Copying is blocked here. The plain text is below: select it and copy.')
    }
  }

  const share = async () => {
    const value = text()
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: L.TITLE.en, text: value })
        setMsg('')
        return
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
      }
    }
    setPlain(true)
    setMsg('Sharing is not available on this browser. The plain text is below.')
  }

  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
  const readAloud = () => {
    const synth = window.speechSynthesis
    if (speaking) {
      synth.cancel()
      setSpeaking(false)
      return
    }
    const u = new SpeechSynthesisUtterance(recordSpeech(rec, lang))
    u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang === 'hi' ? 'hi' : 'en-in'))
    if (voice) u.voice = voice
    u.rate = 0.95
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    synth.cancel()
    synth.speak(u)
    setSpeaking(true)
  }

  // "New incident" forgets this bite and its timer so the next person starts clean. The medical
  // profile and emergency contacts belong to the phone's owner and are kept.
  const newIncident = () => {
    if (!window.confirm('Start a new incident? This record is cleared. Your medical profile and contacts are kept.')) return
    window.speechSynthesis?.cancel()
    clearWashTimer()
    clearBiteRecord()
    writeLS('fs.nowStep', 0)
    writeLS('fs.triage', null)
    navigate('/')
  }

  useEffect(() => {
    if (plain) plainRef.current?.select()
  }, [plain])

  const lbl = (k: LabelKey) =>
    lang === 'hi' ? (
      <>
        <span lang="hi">{L[k].hi}</span>
        <span className="rec-en">{L[k].en}</span>
      </>
    ) : (
      L[k].en
    )

  return (
    <div className="report">
      <div className="report-in">
        <div className="no-print report-top">
          <a className="hdr-link" href={href('/')}>
            Close
          </a>
          <div className="seg lang-seg" role="group" aria-label="Report language">
            <button type="button" className={`btn btn-sm ${lang === 'en' ? 'on' : ''}`} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
              English
            </button>
            <button type="button" className={`btn btn-sm ${lang === 'hi' ? 'on' : ''}`} aria-pressed={lang === 'hi'} onClick={() => setLang('hi')} lang="hi">
              हिन्दी
            </button>
          </div>
        </div>
        <p className="no-print rec-private">Saved only on this phone. Nothing is uploaded.</p>

        <article className="rec" aria-label="Incident record" lang={lang === 'hi' ? 'hi' : 'en'}>
          <h1 className="rec-title">{lbl('TITLE')}</h1>
          <p className="rec-gen">
            {lang === 'hi' ? `${L.GENERATED.hi} / ${L.GENERATED.en}` : L.GENERATED.en} {hm(rec.generatedAt.toISOString())} · {day(rec.generatedAt)}
          </p>

          {rec.sections.map((s) => (
            <section className="rec-sec" key={s.id}>
              {s.list && (
                <>
                  <h2 className="rec-label">{lbl(s.list.key)}</h2>
                  {s.list.items.length > 0 && (
                    <ul className="rec-list">
                      {s.list.items.map((it) => (
                        <li key={it} className={it.includes('Unknown') ? 'unk' : ''}>
                          {it}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {s.rows && (
                <dl className="rec-rows">
                  {s.rows.map((r) => (
                    <div className="rec-row" key={r.key}>
                      <dt className="rec-label">{lbl(r.key)}</dt>
                      <dd className={`rec-value ${r.unknown ? 'unk' : ''}`}>{r.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ))}

          <footer className="rec-foot">
            {lang === 'hi' && (
              <>
                <p lang="hi">{L.FOOT_1.hi}</p>
                <p lang="hi">{L.FOOT_2.hi}</p>
              </>
            )}
            <p>{L.FOOT_1.en}</p>
            <p>
              <b>{L.FOOT_2.en}</b>
            </p>
          </footer>
        </article>

        <div className="no-print rec-actions">
          <div className="grid2">
            {canSpeak && (
              <button type="button" className={`btn ${speaking ? 'on' : ''}`} aria-pressed={speaking} onClick={readAloud}>
                {speaking ? 'Stop reading' : 'Read aloud'}
              </button>
            )}
            <button type="button" className="btn" onClick={copy}>
              Copy
            </button>
            <button type="button" className="btn" onClick={share}>
              Share
            </button>
            <button type="button" className="btn" onClick={() => window.print()}>
              Print / PDF
            </button>
          </div>
          {!canSpeak && <p className="body">Read aloud is not available on this browser.</p>}
          {msg && (
            <p className="body" role="status" style={{ marginTop: 12 }}>
              {msg}
            </p>
          )}
          {plain && (
            <textarea ref={plainRef} className="inp rec-plain" readOnly value={text()} aria-label="Incident record as plain text" />
          )}

          <div className="stack" style={{ marginTop: 20 }}>
            <a className="btn btn-solid" href={href('/now/details')}>
              Add or change details
            </a>
            <button type="button" className="btn" onClick={newIncident}>
              New incident
            </button>
          </div>

          {hasContacts(med) && (
            <>
              <h2 className="h2">Call someone</h2>
              <CallContacts />
            </>
          )}

          <h2 className="h2">Emergency numbers</h2>
          <div className="stack">
            {helplines.map((h) => (
              <a key={h.number} className="tel" href={`tel:${h.number}`}>
                <span className="tel-num">{h.number}</span>
                <span className="tel-txt">
                  <b>{h.label}</b>
                  <span>{h.note}</span>
                </span>
              </a>
            ))}
          </div>

          <div className="stack" style={{ marginTop: 24 }}>
            <a className="btn" href={href('/profile/medical')}>
              Edit medical profile
            </a>
            <a className="btn btn-ghost" href={href('/')}>
              Back to start
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
