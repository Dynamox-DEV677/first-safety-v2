/**
 * "Where is the bite?" - asked once, after the animal is known (§6).
 *
 * THE LINE THIS SCREEN MUST NEVER CROSS
 * The site selects which sourced lines are shown and is recorded for the handover report. It does
 * not produce a verdict. The app never tells the user their WHO exposure category, never says how
 * likely rabies is, never says whether they need immunoglobulin, never says they'll be fine. That is
 * a clinician's call made with the patient in front of them. Do not "improve" this into a grade.
 */
import { SITES, type Site } from '../data/bite'
import { navigate } from '../hooks/useRoute'
import { updateBiteRecord, useBiteRecord } from '../hooks/useBiteRecord'
import { useTimer } from '../hooks/useTimer'

export default function AreaScreen() {
  const bite = useBiteRecord()
  const timer = useTimer()

  const pick = (id: Site) => {
    updateBiteRecord({ site: id })
    navigate('/now/details')
  }

  // Red means it acts: this starts the 15 minutes at once, exactly like the entry button.
  const washNow = () => {
    if (timer.status === 'idle') timer.start()
    navigate('/now/step/1')
  }

  return (
    <div className="page-main" style={{ display: 'flex', flexDirection: 'column' }}>
      <p className="eyebrow">Tell me what happened</p>
      <h1 className="title">Where is the bite?</h1>

      <div className="grid2 sites" role="group" aria-label="Where is the bite">
        {SITES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`btn ${bite?.site === s.id ? 'on' : ''}`}
            aria-pressed={bite?.site === s.id}
            onClick={() => pick(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="actions">
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/now/details')}>
            Skip
          </button>
          <button type="button" className="btn btn-red" onClick={washNow}>
            Wash now
          </button>
        </div>
      </div>
    </div>
  )
}
