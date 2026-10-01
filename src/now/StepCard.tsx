import { HOSPITAL_LINE, type Step } from '../data/nowMode'
import { href } from '../hooks/useRoute'
import SourceNote from '../components/SourceNote'
import TelLink from '../components/TelLink'
import Timer from './Timer'
import PrepPanel from './PrepPanel'
import AnimalNotes from '../components/Sourced'

interface Props {
  step: Step
  /** Shown on the last step: what to tell the doctor about the animal. */
  triageNote?: string
}

export default function StepCard({ step, triageNote }: Props) {
  const isHospitalStep = step.id === 6
  return (
    <article>
      <h1 className="title">{step.title}</h1>

      {step.timerSeconds ? (
        <>
          <Timer />
          <PrepPanel />
        </>
      ) : null}

      <p className="lead">{step.instruction}</p>
      {step.detail && <p className="body">{step.detail}</p>}

      {isHospitalStep && (
        <div className="stack" style={{ margin: '0 0 20px' }}>
          <a className="btn btn-solid" href={href('/report')}>
            I&rsquo;m at the clinic &mdash; show the record
          </a>
        </div>
      )}
      {isHospitalStep && <AnimalNotes />}

      {step.calls && (
        <div className="stack" style={{ margin: '0 0 20px' }}>
          {step.calls.map((c) => (
            <TelLink key={c.number} number={c.number} label={c.label} note={c.note} />
          ))}
        </div>
      )}

      {step.donts && (
        <ul className="donts">
          {step.donts.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}

      {triageNote && (
        <p className="body">
          <b>About the animal: </b>
          {triageNote}
        </p>
      )}

      {step.mythBuster && (
        <div className="myth">
          <p className="eyebrow">Myth</p>
          <p className="q">{step.mythBuster.myth}</p>
          <p className="eyebrow">Fact</p>
          <p>{step.mythBuster.fact}</p>
        </div>
      )}

      {!isHospitalStep && <p className="hospital-line">{HOSPITAL_LINE}</p>}

      <SourceNote ids={step.sources} />
    </article>
  )
}
