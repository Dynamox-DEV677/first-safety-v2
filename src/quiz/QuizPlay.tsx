import { useMemo, useState } from 'react'
import { DIFFICULTIES, questionsFor, type Difficulty, type QuizQuestion } from '../data/quizzes'
import { sourceLabel } from '../data/sources'
import { href, navigate } from '../hooks/useRoute'
import { useScores } from '../hooks/useScores'
import NotFound from '../components/NotFound'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Prepared {
  q: QuizQuestion
  /** Option indices in display order. */
  order: number[]
}

function prepare(d: Difficulty): Prepared[] {
  return shuffle(questionsFor(d)).map((q) => ({ q, order: shuffle(q.options.map((_, i) => i)) }))
}

export default function QuizPlay({ difficulty }: { difficulty: string }) {
  const info = DIFFICULTIES.find((x) => x.id === difficulty)
  const d = info?.id
  const [round, setRound] = useState(0)
  const set = useMemo(() => (d ? prepare(d) : []), [d, round])
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [finished, setFinished] = useState(false)
  const [saved, setSaved] = useState(false)
  const scores = useScores()
  const [name, setName] = useState(scores.name)

  if (!info || !d || set.length === 0) return <NotFound />

  const current = set[index]
  const total = set.length

  const pick = (optionIndex: number) => {
    if (chosen !== null) return
    setChosen(optionIndex)
    if (optionIndex === current.q.answer) setCorrect((c) => c + 1)
  }

  const next = () => {
    if (index + 1 >= total) {
      setFinished(true)
      return
    }
    setIndex(index + 1)
    setChosen(null)
  }

  const save = () => {
    const trimmed = name.trim().slice(0, 16)
    scores.setName(trimmed)
    scores.add({ difficulty: d, score: correct, total, date: new Date().toISOString(), name: trimmed || 'You' })
    setSaved(true)
  }

  const again = () => {
    setRound((r) => r + 1)
    setIndex(0)
    setChosen(null)
    setCorrect(0)
    setFinished(false)
    setSaved(false)
  }

  if (finished) {
    return (
      <div className="page-main">
        <p className="eyebrow">{info.title} quiz · finished</p>
        <h1 className="title">Your score</h1>
        <div className="score">
          {correct}
          <small>/{total}</small>
        </div>
        <p className="body">
          {correct === total
            ? 'Perfect. You know exactly what to do.'
            : correct >= Math.ceil(total * 0.7)
              ? 'Good. Check the cards for the ones you missed.'
              : 'Keep going. Every card you learn could save a life.'}
        </p>

        {!saved ? (
          <>
            <label className="lbl" htmlFor="nick">
              Name for the scoreboard (optional)
            </label>
            <input
              id="nick"
              className="inp"
              value={name}
              maxLength={16}
              placeholder="You"
              onChange={(e) => setName(e.target.value)}
            />
            <button type="button" className="btn btn-solid" style={{ marginTop: 12 }} onClick={save}>
              Save score
            </button>
          </>
        ) : (
          <p className="body">Saved to the scores on this phone.</p>
        )}

        <div className="stack" style={{ marginTop: 16 }}>
          <button type="button" className="btn" onClick={again}>
            Try again
          </button>
          <a className="btn" href={href('/leaderboard')}>
            See scores
          </a>
          <a className="btn btn-ghost" href={href('/learn')}>
            Back to Learn
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="page-main">
      <p className="eyebrow">
        {info.title} · question {index + 1} of {total}
      </p>
      <div className="prog" aria-hidden="true">
        {set.map((_, i) => (
          <span key={i} className={i < index ? 'done' : i === index ? 'cur' : ''} />
        ))}
      </div>

      <p className="lead">{current.q.q}</p>

      <div className="stack">
        {current.order.map((optIdx) => {
          const isAnswer = optIdx === current.q.answer
          const isChosen = chosen === optIdx
          const cls = ['btn', 'opt']
          if (chosen !== null) {
            cls.push('locked')
            if (isAnswer) cls.push('correct')
            else if (isChosen) cls.push('wrong')
          }
          return (
            <button key={optIdx} type="button" className={cls.join(' ')} onClick={() => pick(optIdx)}>
              <span>{current.q.options[optIdx]}</span>
              {chosen !== null && isAnswer && <span className="tag">Correct</span>}
              {chosen !== null && isChosen && !isAnswer && <span className="tag">Your answer</span>}
            </button>
          )
        })}
      </div>

      {chosen !== null && (
        <>
          <div className="why">
            <p className="eyebrow">{chosen === current.q.answer ? 'Right' : 'Not quite'}</p>
            <p>{current.q.why}</p>
            <p className="small" style={{ margin: 0 }}>
              Source: {sourceLabel(current.q.sources)}
            </p>
          </div>
          <button type="button" className="btn btn-solid" onClick={next}>
            {index + 1 >= total ? 'See my score' : 'Next question'}
          </button>
        </>
      )}

      <p className="small" style={{ marginTop: 20 }}>
        <button type="button" className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: 0, minHeight: 40 }} onClick={() => navigate('/learn/quiz')}>
          Quit quiz
        </button>
      </p>
    </div>
  )
}
