import { useAchievements } from '../hooks/useAchievements'

function when(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** Text-only badges. Unlocked ones have a solid border; locked ones fade back. */
export default function AchievementBadges() {
  const { list, unlockedCount, total } = useAchievements()
  return (
    <div>
      <p className="small" style={{ margin: '0 0 12px' }}>
        {unlockedCount} of {total} unlocked
      </p>
      <div className="badges">
        {list.map(({ achievement: a, unlockedAt }) => (
          <div key={a.id} className={`badge ${unlockedAt ? '' : 'locked'}`}>
            <b>{a.title}</b>
            <span>{a.desc}</span>
            <span className="when">{unlockedAt ? `Unlocked ${when(unlockedAt)}` : 'Locked'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
