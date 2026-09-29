import { href } from '../hooks/useRoute'
import { fmt, useTimer } from '../hooks/useTimer'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface Props {
  /** True only on emergency routes other than the timer screen itself. */
  showMiniTimer: boolean
}

const TWO_HOURS = 2 * 60 * 60 * 1000

/** Wordmark only. Navigation lives in the bottom bar; the emergency path has none. */
export default function Header({ showMiniTimer }: Props) {
  const t = useTimer()
  const [dismissedFor, setDismissedFor] = useLocalStorage<number | null>('fs.timerDismissed', null)

  const expired = t.startedAt !== null && Date.now() - t.startedAt > TWO_HOURS
  const showBar = showMiniTimer && t.status !== 'idle' && !expired && dismissedFor !== t.startedAt

  return (
    <header className="hdr">
      <div className="wrap hdr-row">
        <a className="wordmark" href={href('/')}>
          First Safety
        </a>
      </div>
      {showBar && (
        <div className="minibar">
          <div className="wrap minibar-in">
            <a className="minibar-link" href={href('/now/step/1')}>
              <span>{t.status === 'running' ? 'Wash timer running' : 'Wash timer done'}</span>
              <span className="minibar-time">{t.status === 'running' ? `${fmt(t.remaining)} left` : '15 min'}</span>
            </a>
            <button type="button" className="minibar-x" onClick={() => setDismissedFor(t.startedAt)} aria-label="Dismiss timer banner">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
