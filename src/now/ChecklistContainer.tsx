import { useEffect } from 'react'
import { steps, triage, type DogKnown } from '../data/nowMode'
import { href } from '../hooks/useRoute'
import { useLocalStorage, writeLS } from '../hooks/useLocalStorage'
import { markStepCompleted } from '../hooks/useBiteRecord'
import NotFound from '../components/NotFound'
import StepCard from './StepCard'

/** One step per screen. Huge text, one big Next. */
export default function ChecklistContainer({ step }: { step: number }) {
  const current = steps.find((s) => s.id === step)
  const [known] = useLocalStorage<DogKnown | null>('fs.triage', null)

  useEffect(() => {
    if (!current) return
    writeLS('fs.nowStep', current.id)
    // Record the step on display, not on leaving it: the last step would otherwise never be
    // recorded, which both hid the achievement and understated the first aid on the report.
    markStepCompleted(current.id)
  }, [current])

  if (!current) return <NotFound />

  const isLast = current.id === steps.length
  const next = isLast ? '/now/go' : `/now/step/${current.id + 1}`
  const prev = current.id === 1 ? '/now/triage' : `/now/step/${current.id - 1}`

  return (
    <div className="page-main" style={{ display: 'flex', flexDirection: 'column' }}>
      <p className="eyebrow">
        Step {current.id} of {steps.length}
      </p>
      <div className="steps-bar" aria-hidden="true">
        {steps.map((s) => (
          <span key={s.id} className={s.id <= current.id ? 'on' : ''} />
        ))}
      </div>

      <StepCard step={current} triageNote={isLast && known ? triage.notes[known] : undefined} />

      <div className="actions">
        <div className="btn-row">
          <a className="btn btn-ghost" href={href(prev)}>
            Back
          </a>
          <a className="btn btn-solid" href={href(next)}>
            {isLast ? 'Where to go' : 'Next'}
          </a>
        </div>
      </div>
    </div>
  )
}
