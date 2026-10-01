import { useLocalStorage } from '../hooks/useLocalStorage'
import { useTimer } from '../hooks/useTimer'
import { useBiteRecord } from '../hooks/useBiteRecord'
import EntryScreen from '../now/EntryScreen'

/** A session older than this is not resumed on a fresh load. The record itself is kept. */
const RESUME_WINDOW_MS = 30 * 60 * 1000

/**
 * Home. Always opens on the entry screen - never on a previous session's screens.
 * A recent, unfinished session gets a small "Continue" affordance underneath; a finished one or
 * one older than 30 minutes does not, though its record survives for the handover report until
 * "New incident" is tapped.
 */
export default function ModeSelector() {
  const timer = useTimer()
  const bite = useBiteRecord()
  const [lastStep] = useLocalStorage<number>('fs.nowStep', 0)

  const startedAt = bite?.openedAt || bite?.biteAt
  const ageMs = startedAt ? Date.now() - Date.parse(startedAt) : Number.POSITIVE_INFINITY
  const complete = Boolean(bite?.completedAt)
  const recent = Number.isFinite(ageMs) && ageMs >= 0 && ageMs < RESUME_WINDOW_MS
  const inProgress = timer.status === 'running' || lastStep > 0

  const resumeStep = recent && !complete && inProgress ? Math.max(1, lastStep) : null

  return (
    <div className="page-main" style={{ display: 'flex', flexDirection: 'column' }}>
      <EntryScreen resumeStep={resumeStep} />
    </div>
  )
}
