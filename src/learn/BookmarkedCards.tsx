import { myths } from '../data/learnMode'
import { sourceLabel } from '../data/sources'
import { href } from '../hooks/useRoute'
import { useLearnProgress } from '../hooks/useLearnProgress'

export default function BookmarkedCards() {
  const p = useLearnProgress()
  const cards = myths.filter((m) => p.isBookmarked(m.id))

  return (
    <div className="page-main">
      <p className="eyebrow">Learn · Bookmarked</p>
      <h1 className="title">Saved facts</h1>

      {cards.length === 0 ? (
        <p className="body">Nothing saved yet. Open a topic and tap Bookmark on any card.</p>
      ) : (
        cards.map((c) => (
          <div className="bm" key={c.id}>
            <p className="eyebrow">People say</p>
            <p className="q">{c.myth}</p>
            <p className="eyebrow">Fact</p>
            <p className="a">{c.fact}</p>
            <p className="small">Source: {sourceLabel(c.sources)}</p>
            <button type="button" className="btn btn-ghost" onClick={() => p.toggleBookmark(c.id)}>
              Remove bookmark
            </button>
          </div>
        ))
      )}

      <div className="actions">
        <a className="btn" href={href('/learn')}>
          Back to topics
        </a>
      </div>
    </div>
  )
}
