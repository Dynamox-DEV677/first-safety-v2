import { useTimer } from '../hooks/useTimer'

/** On the question screens while the 15 minutes run: the questions never come before the water. */
export default function WashingNote() {
  const t = useTimer()
  if (t.status !== 'running') return null
  return (
    <p className="body" data-wash="note">
      <b>Keep washing while you answer.</b> The timer is running.
    </p>
  )
}
