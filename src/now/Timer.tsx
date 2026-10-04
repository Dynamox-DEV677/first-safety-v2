import { fmt, useTimer } from '../hooks/useTimer'
import { useWakeLock } from '../hooks/useWakeLock'

/**
 * The 15-minute wound-wash countdown. The most important element in the app.
 * Red is used here because this is the emergency path.
 */
export default function Timer() {
  const t = useTimer()
  useWakeLock(t.status === 'running')
  const pct = Math.min(100, (t.elapsed / t.total) * 100)

  const label =
    t.status === 'idle' ? 'minutes of washing' : t.status === 'running' ? 'remaining – keep washing' : 'done'

  const onReset = () => {
    if (window.confirm('Reset the timer? Only do this if you have not started washing yet.')) t.reset()
  }

  return (
    <section className="timer" aria-label="15 minute wash timer">
      <div className="timer-digits" role="timer" aria-live={t.status === 'running' ? 'off' : 'polite'}>
        {fmt(t.remaining)}
      </div>
      <div className="timer-label">{label}</div>

      <div className="timer-track" aria-hidden="true">
        <div className="timer-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="timer-meta">
        <span>{fmt(t.elapsed, 'down')} elapsed</span>
        <span>{fmt(t.total)} total</span>
      </div>

      {t.status === 'idle' && (
        <button type="button" className="btn btn-red" onClick={t.start}>
          Start the 15-minute timer
        </button>
      )}
      {t.status === 'running' && (
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          Reset timer
        </button>
      )}
      {t.status === 'done' && (
        <>
          <p className="timer-done">15 minutes done. Go to the next step.</p>
          <button type="button" className="btn btn-ghost" onClick={t.reset}>
            Start again
          </button>
        </>
      )}
    </section>
  )
}
