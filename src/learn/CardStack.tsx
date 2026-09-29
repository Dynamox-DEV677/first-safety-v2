import { useMemo, useState } from 'react'
import { mythsByTopic, topics } from '../data/learnMode'
import { href } from '../hooks/useRoute'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useLearnProgress } from '../hooks/useLearnProgress'
import NotFound from '../components/NotFound'
import MythCard from './MythCard'
import BookmarkButton from './BookmarkButton'
import ProgressIndicator from './ProgressIndicator'

export default function CardStack({ topicId }: { topicId: string }) {
  const topic = topics.find((t) => t.id === topicId)
  const cards = useMemo(() => mythsByTopic(topicId), [topicId])
  const [savedIndex, setSavedIndex] = useLocalStorage<number>(`fs.pos.${topicId}`, 0)
  const [flipped, setFlipped] = useState(false)
  const p = useLearnProgress()

  if (!topic || cards.length === 0) return <NotFound />

  const index = Math.min(Math.max(0, savedIndex), cards.length - 1)
  const card = cards[index]
  const last = index === cards.length - 1

  const go = (n: number) => {
    setFlipped(false)
    setSavedIndex(Math.max(0, Math.min(cards.length - 1, n)))
  }

  return (
    <div className="page-main">
      <p className="eyebrow">
        {topic.title} · {index + 1} of {cards.length}
      </p>
      <ProgressIndicator total={cards.length} index={index} learned={cards.map((c) => p.isLearned(c.id))} />

      <MythCard card={card} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />

      <div className="card-actions">
        <button
          type="button"
          className={`btn ${p.isLearned(card.id) ? 'on' : ''}`}
          aria-pressed={p.isLearned(card.id)}
          onClick={() => p.toggleLearned(card.id)}
        >
          {p.isLearned(card.id) ? 'Learned' : 'Mark as learned'}
        </button>
        <BookmarkButton on={p.isBookmarked(card.id)} onToggle={() => p.toggleBookmark(card.id)} />
      </div>

      <div className="nav-row">
        <button type="button" className="btn" onClick={() => go(index - 1)} disabled={index === 0}>
          Previous
        </button>
        {last ? (
          <a className="btn btn-solid" href={href('/learn')} onClick={() => setSavedIndex(0)}>
            Done
          </a>
        ) : (
          <button type="button" className="btn btn-solid" onClick={() => go(index + 1)}>
            Next
          </button>
        )}
      </div>

      <p className="small" style={{ marginTop: 20 }}>
        <a href={href('/learn')}>All topics</a>
      </p>
    </div>
  )
}
