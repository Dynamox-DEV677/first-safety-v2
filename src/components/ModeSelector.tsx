import { href } from '../hooks/useRoute'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useTimer } from '../hooks/useTimer'
import EntryScreen from '../now/EntryScreen'

/** Home. One very large emergency button; learning is second. */
export default function ModeSelector() {
  const t = useTimer()
  const [lastStep] = useLocalStorage<number>('fs.nowStep', 0)
  const resumeStep = t.status !== 'idle' || lastStep > 0 ? Math.max(1, lastStep) : null

  return (
    <div className="page-main stack" style={{ gap: 16 }}>
      <h1 className="sr-only">First Safety - dog bite first aid and rabies prevention</h1>
      <EntryScreen resumeStep={resumeStep} />
      <a className="btn" href={href('/learn')}>
        Learn about rabies
      </a>
      <p className="small center" style={{ margin: '8px 0 0' }}>
        Works offline. No login. No tracking.
      </p>
    </div>
  )
}
