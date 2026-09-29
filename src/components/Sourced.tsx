import { ANIMALS, COMMON, GATE_MESSAGE, gatedCount, isAnimalId, verified, type Sourced as SourcedString } from '../content'
import { useBiteRecord } from '../hooks/useBiteRecord'

/** One sourced line with its citation. Unverified strings never reach this component. */
function Line({ s }: { s: SourcedString }) {
  return (
    <li className="srcd">
      <p className="srcd-text">{s.text}</p>
      <p className="srcd-cite">
        <a href={s.url} target="_blank" rel="noopener noreferrer">
          {s.source}
        </a>
        {' · read '}
        {s.accessed}
      </p>
    </li>
  )
}

/**
 * The verify gate. Renders the verified strings; if any were held back it says so, in the fixed
 * wording, instead of silently showing less.
 */
export function VerifyGate({ notes, title }: { notes: SourcedString[]; title?: string }) {
  const ok = verified(notes)
  const held = gatedCount(notes)
  if (ok.length === 0 && held === 0) return null
  return (
    <section className="gate">
      {title && <h2 className="h2">{title}</h2>}
      {ok.length > 0 && (
        <ul className="srcd-list">
          {ok.map((s) => (
            <Line key={s.id} s={s} />
          ))}
        </ul>
      )}
      {held > 0 && <p className="gate-msg">{GATE_MESSAGE}</p>}
    </section>
  )
}

/**
 * What the sources say about the animal the patient chose. Verbatim, cited, and framed as
 * information for the clinician - never as a verdict.
 */
export default function AnimalNotes() {
  const bite = useBiteRecord()
  const id = bite?.animal ?? ''
  if (!isAnimalId(id)) return null
  const a = ANIMALS[id]
  return (
    <VerifyGate
      notes={a.notes}
      title={`What the sources say about a ${a.label.toLowerCase()} bite`}
    />
  )
}

/** The shared guidance every animal gets, for the help screen. */
export function CommonNotes() {
  return <VerifyGate notes={COMMON} title="What the sources say about every bite" />
}
