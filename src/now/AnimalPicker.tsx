import { useState } from 'react'
import { ANIMALS, ANIMAL_ORDER, NOT_A_MAMMAL, type AnimalId } from '../content'
import { navigate } from '../hooks/useRoute'
import { useTimer } from '../hooks/useTimer'
import { updateBiteRecord } from '../hooks/useBiteRecord'
import TelLink from '../components/TelLink'

/**
 * "Tell me what happened" - the tap list. One screen, big targets, no scrolling at 360px.
 * Choosing an animal only records it for the clinician and selects which sourced notes are shown
 * later. It never changes the first-aid steps, and washing is always one tap away.
 */
export default function AnimalPicker() {
  const [notMammal, setNotMammal] = useState(false)
  const timer = useTimer()

  // Red means it acts: the skip starts the 15 minutes at once, exactly like the entry button.
  const skipToWash = () => {
    if (timer.status === 'idle') timer.start()
    navigate('/now/step/1')
  }

  const pick = (id: AnimalId | 'other') => {
    updateBiteRecord({ animal: id })
    navigate('/now/triage')
  }

  return (
    <div className="page-main" style={{ display: 'flex', flexDirection: 'column' }}>
      <p className="eyebrow">Tell me what happened</p>
      <h1 className="title">What bit or scratched you?</h1>

      <div className="grid2" role="group" aria-label="Animal">
        {ANIMAL_ORDER.map((id) => (
          <button key={id} type="button" className="btn" onClick={() => pick(id)}>
            {ANIMALS[id].label}
          </button>
        ))}
        <button type="button" className="btn" onClick={() => pick('other')}>
          Another animal with fur
        </button>
        <button
          type="button"
          className={`btn ${notMammal ? 'on' : ''}`}
          aria-pressed={notMammal}
          onClick={() => setNotMammal((v) => !v)}
        >
          Snake, insect or spider
        </button>
      </div>

      {notMammal && (
        <div className="notice" role="status" style={{ marginTop: 16 }}>
          <p style={{ margin: '0 0 12px' }}>{NOT_A_MAMMAL}</p>
          <div className="stack">
            <TelLink number="108" label="Ambulance" note="Coverage varies by state." />
            <TelLink number="112" label="Emergency" note="All India, any phone, free." />
          </div>
        </div>
      )}

      <div className="actions">
        <button type="button" className="btn btn-red" onClick={skipToWash}>
          Skip - start washing now
        </button>
      </div>
    </div>
  )
}
