import { AREAS, CONTACT_TYPES } from '../data/bite'
import { navigate } from '../hooks/useRoute'
import { toggleBiteListItem, useBiteRecord } from '../hooks/useBiteRecord'
import { useTimer } from '../hooks/useTimer'

/**
 * Area of injury and type of contact. Tap everything that applies.
 *
 * This screen records; it does not grade. The contact list is the one on the NCDC animal-bite
 * patient form, in the clinic's own words, so the doctor reads familiar vocabulary on the handover
 * report - but the WHO exposure category those items map to is the doctor's call, never the app's.
 * Nothing chosen here changes the first-aid steps, and washing is one tap away.
 */
export default function AreaScreen() {
  const bite = useBiteRecord()
  const timer = useTimer()
  const areas = bite?.areas ?? []
  const contact = bite?.contact ?? []

  const toggleArea = (id: string) => toggleBiteListItem('areas', id)
  const toggleContact = (id: string) => toggleBiteListItem('contact', id)

  // Red means it acts: this starts the 15 minutes at once, exactly like the entry button.
  const washNow = () => {
    if (timer.status === 'idle') timer.start()
    navigate('/now/step/1')
  }

  return (
    <div className="page-main" style={{ display: 'flex', flexDirection: 'column' }}>
      <p className="eyebrow">Tell me what happened · all optional</p>
      <h1 className="title">Where is the injury?</h1>
      <p className="body">Tap everything that applies. This is saved for the doctor. It does not change what to do next.</p>

      <div className="grid2" role="group" aria-label="Area of injury">
        {AREAS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`btn ${areas.includes(a.id) ? 'on' : ''}`}
            aria-pressed={areas.includes(a.id)}
            onClick={() => toggleArea(a.id)}
          >
            {a.label}
          </button>
        ))}
      </div>

      <p className="eyebrow" style={{ marginTop: 26 }}>
        What did the animal do?
      </p>
      <div className="stack" role="group" aria-label="Type of contact">
        {CONTACT_TYPES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`btn opt ${contact.includes(c.id) ? 'on' : ''}`}
            aria-pressed={contact.includes(c.id)}
            onClick={() => toggleContact(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="small" style={{ marginTop: 12 }}>
        The doctor decides the exposure category from what you describe. This app never does.
      </p>

      <div className="actions">
        <div className="btn-row">
          <button type="button" className="btn btn-red" onClick={washNow}>
            Wash now
          </button>
          <button type="button" className="btn btn-solid" onClick={() => navigate('/now/triage')}>
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
