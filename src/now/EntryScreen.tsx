import { href, navigate } from '../hooks/useRoute'
import { writeLS } from '../hooks/useLocalStorage'
import { startBiteRecord } from '../hooks/useBiteRecord'
import { clearWashTimer, useTimer } from '../hooks/useTimer'

interface Props {
  /** Step to resume, only for a recent, unfinished session. */
  resumeStep: number | null
}

/**
 * The entry screen. Two buttons, nothing competing with them.
 *
 * Red is first and taller because if someone is standing there with a fresh bite, the correct
 * action is to start washing - not to answer questions. Tapping red starts the 15 minutes at once
 * and lands on the wash step; someone who never touches the second button has still been helped
 * correctly. The second button is for telling what happened, by voice or taps; its first answer
 * starts the 15 minutes too, and the rest is asked while washing (see washFirst.ts).
 */
export default function EntryScreen({ resumeStep }: Props) {
  const timer = useTimer()

  const fresh = (via: 'wash' | 'tell') => {
    // A new incident. Clearing the wash timer first is what stops a finished timer from an
    // earlier session showing the wash step as already "done".
    clearWashTimer()
    startBiteRecord(via)
    writeLS('fs.nowStep', 0)
    writeLS('fs.triage', null)
  }

  const startWashing = () => {
    fresh('wash')
    timer.start()
    navigate('/now/step/1')
  }

  const tell = () => {
    fresh('tell')
    navigate('/now/animal')
  }

  return (
    <div className="entry">
      <p className="entry-brand">First Safety</p>
      <h1 className="entry-q">What happened?</h1>

      <button type="button" className="entry-btn red" onClick={startWashing}>
        <span className="ico" aria-hidden="true">🩸</span>
        <span>
          <b>Start the 15 minutes</b>
          <span>Wash the wound now</span>
        </span>
      </button>

      <button type="button" className="entry-btn grey" onClick={tell}>
        <span className="ico" aria-hidden="true">🎙</span>
        <span>
          <b>Tell me what happened</b>
          <span>Speak or tap</span>
        </span>
      </button>

      {resumeStep !== null && (
        <a className="btn" href={href(`/now/step/${resumeStep}`)}>
          Continue first aid · step {resumeStep}
        </a>
      )}

      <p className="entry-note">Works offline · No account</p>
    </div>
  )
}
