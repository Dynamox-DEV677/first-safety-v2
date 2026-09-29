import { useState } from 'react'
import { href } from '../hooks/useRoute'
import { shareText, useScores } from '../hooks/useScores'

function when(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** Top scores recorded on this phone. There is no server, so nothing leaves the device. */
export default function Leaderboard() {
  const { top, attempts } = useScores()
  const [shared, setShared] = useState<string>('')
  const latest = attempts[attempts.length - 1]

  const share = async () => {
    if (!latest) return
    const text = shareText(latest)
    try {
      if (navigator.share) {
        await navigator.share({ text })
        setShared('Shared.')
      } else {
        await navigator.clipboard.writeText(text)
        setShared('Copied to clipboard.')
      }
    } catch {
      setShared('')
    }
  }

  return (
    <div className="page-main">
      <p className="eyebrow">Scores</p>
      <h1 className="title">Top scores on this phone</h1>

      {latest && (
        <div className="notice">
          Latest: {latest.name || 'You'} scored {latest.score}/{latest.total} on {latest.difficulty}.
          <div className="seg" style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={share}>
              Share this score
            </button>
          </div>
          {shared && (
            <p className="small" style={{ margin: '8px 0 0' }}>
              {shared}
            </p>
          )}
        </div>
      )}

      {top.length === 0 ? (
        <p className="body">No scores yet. Take a quiz and your result appears here.</p>
      ) : (
        <div>
          {top.map((a, i) => (
            <div className="lb" key={`${a.date}-${i}`}>
              <span className="rank">{i + 1}</span>
              <span className="who">
                <b>{a.name || 'Anonymous'}</b>
                <span>
                  {a.difficulty} · {when(a.date)}
                </span>
              </span>
              <span className="sc">
                {a.score}/{a.total}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="small" style={{ marginTop: 20 }}>
        Scores are saved only on this device, so this board is for you, your family and friends who use this phone.
        Nothing is uploaded.
      </p>

      <div className="stack" style={{ marginTop: 20 }}>
        <a className="btn btn-solid" href={href('/learn/quiz')}>
          Take a quiz
        </a>
      </div>
    </div>
  )
}
