import { BODY_PARTS, YES_NO_UNSURE, type YesNoUnsure } from '../data/bite'
import { triage, type DogKnown } from '../data/nowMode'
import { href, navigate } from '../hooks/useRoute'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { updateBiteRecord, useBiteRecord } from '../hooks/useBiteRecord'
import SourceNote from '../components/SourceNote'

/**
 * Three optional taps before first aid. Every answer is only recorded for the doctor's report -
 * none of them changes the first-aid steps. The wash timer stays one tap away at all times.
 */
export default function TriageFlow() {
  const [known, setKnown] = useLocalStorage<DogKnown | null>('fs.triage', null)
  const bite = useBiteRecord()

  const pickPart = (id: string) => updateBiteRecord({ bodyPart: bite?.bodyPart === id ? '' : id })
  const pickBroke = (v: YesNoUnsure) => updateBiteRecord({ brokeSkin: bite?.brokeSkin === v ? '' : v })
  const pickKnown = (v: DogKnown) => {
    setKnown(v)
    updateBiteRecord({ animalKnown: v === 'known' ? 'yes' : 'no' })
  }

  return (
    <div className="page-main" style={{ display: 'flex', flexDirection: 'column' }}>
      <p className="eyebrow">Before first aid · all optional</p>
      <h1 className="title">Three quick taps</h1>
      <p className="body">
        These are saved for the doctor. They do not change what to do next. Skip them if you are near a tap.
      </p>

      <p className="eyebrow" style={{ marginTop: 8 }}>
        Where were you bitten?
      </p>
      <div className="grid2" role="group" aria-label="Body part">
        {BODY_PARTS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`btn ${bite?.bodyPart === b.id ? 'on' : ''}`}
            aria-pressed={bite?.bodyPart === b.id}
            onClick={() => pickPart(b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>

      <p className="eyebrow" style={{ marginTop: 22 }}>
        Did it break the skin?
      </p>
      <div className="seg" role="group" aria-label="Broke skin" data-q="broke">
        {YES_NO_UNSURE.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`btn ${bite?.brokeSkin === o.id ? 'on' : ''}`}
            aria-pressed={bite?.brokeSkin === o.id}
            onClick={() => pickBroke(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <p className="eyebrow" style={{ marginTop: 22 }}>
        {triage.question}
      </p>
      <div className="seg" role="group" aria-label="Dog known" data-q="known">
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
      <p className="small" style={{ marginTop: 10 }}>
        {triage.help}
      </p>
      <SourceNote ids={triage.sources} />

      <div className="actions">
        <div className="stack">
          <button type="button" className="btn btn-solid" onClick={() => navigate('/now/step/1')}>
            Start washing now
          </button>
          <a className="btn btn-ghost" href={href('/now/step/1')}>
            Skip these questions
          </a>
        </div>
      </div>
    </div>
  )
}
