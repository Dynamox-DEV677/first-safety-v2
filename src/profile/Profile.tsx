import { myths } from '../data/learnMode'
import { href } from '../hooks/useRoute'
import { useAchievements } from '../hooks/useAchievements'
import { useLearnProgress } from '../hooks/useLearnProgress'
import { useScores } from '../hooks/useScores'
import { medicalFilledCount, useMedical } from '../hooks/useMedical'
import { useVaccine } from '../hooks/useVaccine'
import AchievementBadges from './AchievementBadges'

export default function Profile() {
  const learn = useLearnProgress()
  const scores = useScores()
  const ach = useAchievements()
  const [med] = useMedical()
  const vaccine = useVaccine()
  const filled = medicalFilledCount(med)

  return (
    <div className="page-main">
      <p className="eyebrow">Profile</p>
      <h1 className="title">Your progress</h1>

      <div className="stats" aria-label="Your progress">
        <div className="stat">
          <b>{learn.currentStreak}</b>
          <span>day streak</span>
        </div>
        <div className="stat">
          <b>
            {learn.learnedCount}/{myths.length}
          </b>
          <span>cards learned</span>
        </div>
        <div className="stat">
          <b>{scores.attempts.length}</b>
          <span>quizzes taken</span>
        </div>
        <div className="stat">
          <b>
            {ach.unlockedCount}/{ach.total}
          </b>
          <span>achievements</span>
        </div>
      </div>
      <p className="small">Everything here is stored on this phone only. No account, nothing uploaded.</p>

      <h2 className="h2">For the doctor</h2>
      <div className="stack">
        <a className="topic" href={href('/report')}>
          <span className="t-main">
            <b>Doctor&rsquo;s report</b>
            <span>Bite time, first aid given, vaccine history, contacts. Print or copy.</span>
          </span>
          <span className="t-count">Open</span>
        </a>
        <a className="topic" href={href('/profile/medical')}>
          <span className="t-main">
            <b>Medical profile and vaccine tracker</b>
            <span>
              {vaccine.next
                ? `Next dose: day ${vaccine.next.day}, ${vaccine.next.dueLabel}.`
                : vaccine.record
                  ? 'Vaccine course complete.'
                  : 'Optional details, saved only on this phone.'}
            </span>
          </span>
          <span className="t-count">{filled ? `${filled} filled` : 'Empty'}</span>
        </a>
      </div>

      <h2 className="h2">Achievements</h2>
      <AchievementBadges />
    </div>
  )
}
