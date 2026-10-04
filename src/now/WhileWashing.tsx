import { href } from '../hooks/useRoute'
import { useTimer } from '../hooks/useTimer'
import { useBiteRecord } from '../hooks/useBiteRecord'
import { nextQuestion } from './washFirst'

/**
 * Under the wash timer while it runs: the questions for the clinic, asked during the fifteen minutes
 * someone would otherwise spend standing at a sink. Optional; the timer keeps running either way.
 */
export default function WhileWashing() {
  const t = useTimer()
  const bite = useBiteRecord()
  if (t.status !== 'running') return null
  return (
    <a className="btn btn-col while-washing" href={href(nextQuestion(bite))} data-wash="questions">
      <span>Answer a few questions while you wash</span>
      <span className="sub">For the clinic. The timer keeps running.</span>
    </a>
  )
}
