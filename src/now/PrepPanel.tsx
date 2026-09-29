import { PREP_SOURCES, markLabel, prepBlocks } from '../data/prep'
import { href } from '../hooks/useRoute'
import { useTimer } from '../hooks/useTimer'
import SourceNote from '../components/SourceNote'

/**
 * Helper checklist that unfolds under the wash timer as the countdown passes each mark.
 * Visibility is derived from the remaining time (wall clock), so a revealed block stays until
 * the timer is reset. Nothing here asks the washing person to move.
 */
export default function PrepPanel() {
  const t = useTimer()
  if (t.status === 'idle') return null

  const visible = prepBlocks.filter((b) => t.remaining <= b.atRemainingSeconds)
  if (visible.length === 0) return null

  return (
    <section className="prep" aria-live="polite" aria-label="While you wash">
      {visible.map((b) => (
        <div className="prep-block" key={b.id}>
          <p className="eyebrow">{markLabel(b.atRemainingSeconds)} left</p>
          <h2>{b.title}</h2>
          <ul>
            {b.items.map((it) => (
              <li key={it.text}>
                {it.text}
                {it.tel && (
                  <>
                    {' '}
                    <a className="tel-inline" href={`tel:${it.tel}`}>
                      {it.tel}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
          {b.note && <p className="note">{b.note}</p>}
          {b.link && (
            <>
              <a className="btn" href={href(b.link.to)}>
                {b.link.label}
              </a>
              <p className="note">{b.link.note}</p>
            </>
          )}
        </div>
      ))}
      <SourceNote ids={PREP_SOURCES} />
    </section>
  )
}
