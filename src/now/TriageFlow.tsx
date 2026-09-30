import { triage, type DogKnown } from '../data/nowMode'
import { href, navigate } from '../hooks/useRoute'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { updateBiteRecord } from '../hooks/useBiteRecord'
import { useTimer } from '../hooks/useTimer'
import SourceNote from '../components/SourceNote'

/**
 * One optional tap before first aid: can the animal be found again? The answer is only recorded
 * for the doctor's report - it never changes the first-aid steps. Washing stays one tap away.
 */
export default function TriageFlow() {
  const [known, setKnown] = useLocalStorage<DogKnown | null>('fs.triage', null)
  const timer = useTimer()

  const pickKnown = (v: DogKnown) => {
    setKnown(v)
    updateBiteRecord({ animalKnown: v === 'known' ? 'yes' : 'no' })
  }

  // Starts the 15 minutes at once and lands on the wash step, like every other "wash" button.
  const startWashing = () => {
    if (timer.status === 'idle') timer.start()
    navigate('/now/step/1')
  }

  return (
    <div className="page-main" style={{ display: 'flex', flexDirection: 'column' }}>
      <p className="eyebrow">Tell me what happened · optional</p>
      <h1 className="title">{triage.question}</h1>
      <p className="body">Saved for the doctor. It does not change what to do next.</p>

      <div className="stack" role="group" aria-label="Animal known" data-q="known">
        {triage.options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`btn btn-col ${known === o.value ? 'on' : ''}`}
            aria-pressed={known === o.value}
            onClick={() => pickKnown(o.value)}
          >
            <span>{o.label}</span>
            <span className="sub" style={known === o.value ? { color: 'inherit', opacity: 0.8 } : undefined}>
              {o.sub}
            </span>
          </button>
        ))}
      </div>
      <p className="small" style={{ marginTop: 12 }}>
        {triage.help}
      </p>
      <SourceNote ids={triage.sources} />

      <div className="actions">
        <div className="btn-row">
          <a className="btn btn-ghost" href={href('/now/area')}>
            Back
          </a>
          <button type="button" className="btn btn-red" onClick={startWashing}>
            Start washing now
          </button>
        </div>
      </div>
    </div>
  )
}
