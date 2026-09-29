interface Props {
  total: number
  index: number
  learned: boolean[]
}

/** One thin segment per card: black when learned, grey when current. */
export default function ProgressIndicator({ total, index, learned }: Props) {
  return (
    <div className="prog" aria-label={`Card ${index + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={learned[i] ? 'done' : i === index ? 'cur' : ''} />
      ))}
    </div>
  )
}
