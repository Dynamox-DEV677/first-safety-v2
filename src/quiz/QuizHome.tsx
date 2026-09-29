import { DIFFICULTIES, questionsFor } from '../data/quizzes'
import { href } from '../hooks/useRoute'
import { useScores } from '../hooks/useScores'

export default function QuizHome() {
  const { bestFor, attempts } = useScores()
  return (
    <div className="page-main">
      <p className="eyebrow">Learn · Quiz</p>
      <h1 className="title">Test yourself</h1>
      <p className="body">
        Fifteen questions per level. You see the right answer and its source after every question. Scores are saved on
        this phone.
      </p>
      <div className="stack">
        {DIFFICULTIES.map((d) => {
          const best = bestFor(d.id)
          const total = questionsFor(d.id).length
          return (
            <a key={d.id} className="topic" href={href(`/learn/quiz/${d.id}`)}>
              <span className="t-main">
                <b>{d.title}</b>
                <span>{d.blurb}</span>
              </span>
              <span className="t-count">{best ? `Best ${best.score}/${best.total}` : `${total} questions`}</span>
            </a>
          )
        })}
      </div>
      <p className="small" style={{ marginTop: 20 }}>
        {attempts.length === 0 ? 'No attempts yet.' : `${attempts.length} attempt${attempts.length === 1 ? '' : 's'} so far.`}{' '}
        <a href={href('/leaderboard')}>See scores</a>
      </p>
    </div>
  )
}
