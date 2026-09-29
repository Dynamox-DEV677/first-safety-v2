import { useEffect, useMemo, useState } from 'react'
import { helplines } from '../data/nowMode'
import { clearBiteRecord, useBiteRecord } from '../hooks/useBiteRecord'
import { useMedical } from '../hooks/useMedical'
import { useVaccine } from '../hooks/useVaccine'
import { clearWashTimer, useTimer } from '../hooks/useTimer'
import { href, navigate } from '../hooks/useRoute'
import { writeLS } from '../hooks/useLocalStorage'
import { REPORT_FOOTER, REPORT_SUBTITLE, REPORT_TITLE, buildReport, reportText, type ReportRow } from './buildReport'

/**
 * The doctor handoff report. Always renders - with an empty profile it is a form to fill by hand.
 * White in both themes, no app chrome, printable. Records only; no interpretation anywhere.
 */
export default function Report() {
  const bite = useBiteRecord()
  const [med] = useMedical()
  const { record: vaccine } = useVaccine()
  const t = useTimer()
  const [now, setNow] = useState(() => new Date())
  const [copied, setCopied] = useState('')

  // "Time since bite" updates live.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const sections = useMemo(
    () =>
      buildReport({
        bite,
        med,
        vaccine,
        liveWashSeconds: t.status === 'idle' ? null : t.elapsed,
        timerRunning: t.status === 'running',
        now,
      }),
    [bite, med, vaccine, t.status, t.elapsed, now],
  )

  const copy = async () => {
    const text = reportText(sections, new Date())
    try {
      await navigator.clipboard.writeText(text)
      setCopied('Copied. Paste it into WhatsApp or a message.')
    } catch {
      setCopied('Could not copy on this browser. Use Print / Save as PDF instead.')
    }
  }

  // "New incident" forgets this bite and its timer so the next person starts clean. The medical
  // profile and emergency contacts belong to the phone's owner and are kept.
  const newIncident = () => {
    if (!window.confirm('Start a new incident? This report is cleared. Your medical profile and contacts are kept.')) return
    clearWashTimer()
    clearBiteRecord()
    writeLS('fs.nowStep', 0)
    writeLS('fs.triage', null)
    navigate('/')
  }

  return (
    <div className="report">
      <div className="report-in">
        <div className="no-print report-top">
          <a className="hdr-link" href={href('/profile')}>
            Close
          </a>
          <span className="small">Saved only on this phone. Nothing is uploaded.</span>
        </div>

        <h1 className="rtitle">{REPORT_TITLE}</h1>
        <p className="rsub">{REPORT_SUBTITLE}</p>

        {sections.map((s) => (
          <section className="rsec" key={s.title}>
            <h2>{s.title}</h2>
            {s.rows.map((r, idx) => (
              <Row key={`${s.title}-${idx}`} row={r} />
            ))}
          </section>
        ))}

        <p className="rfoot">{REPORT_FOOTER}</p>

        <div className="no-print" style={{ marginTop: 24 }}>
          <div className="stack">
            <button type="button" className="btn btn-solid" onClick={() => window.print()}>
              Print / Save as PDF
            </button>
            <button type="button" className="btn" onClick={copy}>
              Copy as text
            </button>
          </div>
          {copied && (
            <p className="small" style={{ marginTop: 10 }}>
              {copied}
            </p>
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
            <button type="button" className="btn" onClick={newIncident}>
              New incident
            </button>
            <a className="btn btn-ghost" href={href('/')}>
              Back to start
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ row }: { row: ReportRow }) {
  return (
    <div className="rrow">
      <div className="rl">{row.label}</div>
      {row.value === null ? (
        <>
          <div className="rv nr">Not recorded</div>
          <span className="blank" aria-hidden="true" />
          {row.note && <div className="small">{row.note}</div>}
        </>
      ) : row.tel ? (
        <a className={`rv ${row.big ? 'rbig' : ''}`} href={`tel:${row.tel.replace(/[^\d+]/g, '')}`}>
          {row.value}
        </a>
      ) : (
        <div className={`rv ${row.big ? 'rbig' : ''}`}>{row.value}</div>
      )}
    </div>
  )
}
