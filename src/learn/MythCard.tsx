import type { Myth } from '../data/learnMode'
import { sourceLabel } from '../data/sources'

interface Props {
  card: Myth
  flipped: boolean
  onFlip: () => void
}

/** Front: the myth. Tap to flip. Back: the fact and its source. */
export default function MythCard({ card, flipped, onFlip }: Props) {
  return (
    <div className="card-wrap">
      <button
        type="button"
        className={`card ${flipped ? 'flipped' : ''}`}
        onClick={onFlip}
        aria-label={flipped ? 'Show the myth again' : 'Show the fact'}
      >
        <span className="face front" aria-hidden={flipped}>
          <span className="eyebrow">People say</span>
          <span className="txt">{card.myth}</span>
          <span className="hint">Tap to see the fact</span>
        </span>
        <span className="face back" aria-hidden={!flipped}>
          <span className="eyebrow">Fact</span>
          <span className="txt">{card.fact}</span>
          <span className="hint">Source: {sourceLabel(card.sources)}</span>
        </span>
      </button>
    </div>
  )
}
