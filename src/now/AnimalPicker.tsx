import { useEffect, useRef, useState } from 'react'
import { ANIMALS, ANIMAL_ORDER, NOT_A_MAMMAL, type AnimalId } from '../content'
import { navigate } from '../hooks/useRoute'
import { useTimer } from '../hooks/useTimer'
import { updateBiteRecord, useBiteRecord } from '../hooks/useBiteRecord'
import TelLink from '../components/TelLink'
import VoiceInput from './VoiceInput'
import WashingNote from './WashingNote'
import { afterFirstAnswer } from './washFirst'

/**
 * "Tell me what happened" - the tap list. One screen, big targets.
 * Choosing an animal records it for the clinician and selects which sourced notes are shown later;
 * it never changes the first-aid steps. It is also the first answer, so it starts the 15 minutes
 * and goes to the wash screen (wash first); the rest is asked while washing.
 */
export default function AnimalPicker() {
  const [notMammal, setNotMammal] = useState(false)
  const timer = useTimer()
  const bite = useBiteRecord()
  const notice = useRef<HTMLDivElement>(null)

  // The out-of-scope notice opens under the buttons; bring it, and its 108 / 112, into view.
  useEffect(() => {
    if (notMammal) notice.current?.scrollIntoView({ block: 'nearest' })
  }, [notMammal])

  // Red means it acts: this starts the 15 minutes at once, exactly like the entry button.
  const toWash = () => {
    if (timer.status === 'idle') timer.start()
    navigate('/now/step/1')
  }

  const pick = (id: AnimalId | 'other') => {
    updateBiteRecord({ animal: id })
    afterFirstAnswer(timer, bite?.site)
  }

  return (
    <div className="page-main" style={{ display: 'flex', flexDirection: 'column' }}>
      <p className="eyebrow">Tell me what happened</p>
      <h1 className="title">What bit or scratched you?</h1>
      <WashingNote />

      <VoiceInput onNotMammal={() => setNotMammal(true)} />

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
        <div ref={notice} className="notice" role="status" style={{ marginTop: 16, scrollMarginBottom: 112 }}>
          <p style={{ margin: '0 0 12px' }}>{NOT_A_MAMMAL}</p>
          <div className="stack">
            <TelLink number="108" label="Ambulance" note="Coverage varies by state." />
            <TelLink number="112" label="Emergency" note="All India, any phone, free." />
          </div>
        </div>
      )}

      <div className="actions">
        <button type="button" className="btn btn-red" onClick={toWash}>
          {timer.status === 'idle' ? 'Skip – start washing now' : 'Back to washing'}
        </button>
      </div>
    </div>
  )
}
