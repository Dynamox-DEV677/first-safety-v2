interface Props {
  number: string
  label: string
  note?: string
}

/** A real tel: link, big enough to hit in a hurry. */
export default function TelLink({ number, label, note }: Props) {
  return (
    <a className="tel" href={`tel:${number.replace(/[^\d+]/g, '')}`}>
      <span className="tel-num">{number}</span>
      <span className="tel-txt">
        <b>{label}</b>
        {note && <span>{note}</span>}
      </span>
    </a>
  )
}
