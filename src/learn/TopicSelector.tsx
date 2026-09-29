import { myths, mythsByTopic, topics } from '../data/learnMode'
import { videos } from '../data/videos'
import { faqs } from '../data/faq'
import { href } from '../hooks/useRoute'
import { useLearnProgress } from '../hooks/useLearnProgress'
import { useScores } from '../hooks/useScores'

export default function TopicSelector() {
  const p = useLearnProgress()
  const { attempts } = useScores()

  return (
    <div className="page-main">
      <p className="eyebrow">Learn</p>
      <h1 className="title">Myths and facts</h1>

      <div className="stats" aria-label="Your progress">
        <div className="stat">
          <b>{p.currentStreak}</b>
          <span>day streak</span>
        </div>
        <div className="stat">
          <b>
            {p.learnedCount}/{myths.length}
          </b>
          <span>cards learned</span>
        </div>
      </div>

      <p className="body">
        Each card shows something people commonly believe. Flip it to see the fact and where it comes from.
      </p>

      <div className="stack">
        {topics.map((t) => {
          const cards = mythsByTopic(t.id)
          const done = cards.filter((c) => p.isLearned(c.id)).length
          return (
            <a key={t.id} className="topic" href={href(`/learn/topic/${t.id}`)}>
              <span className="t-main">
                <b>{t.title}</b>
                <span>{t.blurb}</span>
              </span>
              <span className="t-count">
                {done}/{cards.length}
              </span>
            </a>
          )
        })}
        <a className="topic" href={href('/learn/bookmarks')}>
          <span className="t-main">
            <b>Bookmarked</b>
            <span>Facts you saved to read again.</span>
          </span>
          <span className="t-count">{p.bookmarks.length}</span>
        </a>
      </div>

      <h2 className="h2">More ways to learn</h2>
      <div className="stack">
        <a className="topic" href={href('/learn/quiz')}>
          <span className="t-main">
            <b>Quiz</b>
            <span>Easy, medium and hard. 15 questions each.</span>
          </span>
          <span className="t-count">{attempts.length ? `${attempts.length} taken` : 'New'}</span>
        </a>
        <a className="topic" href={href('/learn/videos')}>
          <span className="t-main">
            <b>Videos</b>
            <span>WHO, CDC and Indian hospital videos. Needs internet.</span>
          </span>
          <span className="t-count">{videos.length}</span>
        </a>
        <a className="topic" href={href('/learn/faq')}>
          <span className="t-main">
            <b>FAQ</b>
            <span>Short answers to the questions people ask most.</span>
          </span>
          <span className="t-count">{faqs.length}</span>
        </a>
      </div>
    </div>
  )
}
