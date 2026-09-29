import { useEffect, useMemo } from 'react'
import { achievements, type Achievement, type ProgressSnapshot, type QuizAttempt } from '../data/achievements'
import { useLocalStorage } from './useLocalStorage'
import { useLearnProgress } from './useLearnProgress'
import { useVaccine } from './useVaccine'
import { useBiteRecord } from './useBiteRecord'
import { steps } from '../data/nowMode'
import { FLAGS_KEY, type Flags } from './flags'

const UNLOCKED_KEY = 'fs.achievements'

export interface AchievementState {
  achievement: Achievement
  unlockedAt?: string
}

export function useAchievements() {
  const [flags] = useLocalStorage<Flags>(FLAGS_KEY, {})
  const [attempts] = useLocalStorage<QuizAttempt[]>('fs.scores', [])
  const [unlocked, setUnlocked] = useLocalStorage<Record<string, string>>(UNLOCKED_KEY, {})
  const learn = useLearnProgress()
  const vaccine = useVaccine()
  const bite = useBiteRecord()

  const stepIds = new Set(steps.map((x) => x.id))
  const stepsSeen = (bite?.stepsCompleted ?? []).filter((n) => stepIds.has(n)).length

  const snapshot: ProgressSnapshot = useMemo(
    () => ({
      learnedCount: learn.learnedCount,
      bookmarksCount: learn.bookmarks.length,
      bestStreak: learn.bestStreak,
      quizAttempts: attempts,
      stepsSeen,
      finalSeen: Boolean(flags.finalSeen),
      timerDone: Boolean(flags.timerDone),
      dosesLogged: vaccine.dosesLogged,
    }),
    [learn.learnedCount, learn.bookmarks.length, learn.bestStreak, attempts, stepsSeen, flags, vaccine.dosesLogged],
  )

  // Persist the first time each achievement is satisfied, so the unlock date is kept.
  useEffect(() => {
    const fresh = achievements.filter((a) => !unlocked[a.id] && a.check(snapshot))
    if (fresh.length === 0) return
    const now = new Date().toISOString()
    setUnlocked((prev) => {
      const next = { ...prev }
      for (const a of fresh) next[a.id] = now
      return next
    })
  }, [snapshot, unlocked, setUnlocked])

  const list: AchievementState[] = achievements.map((a) => ({ achievement: a, unlockedAt: unlocked[a.id] }))
  const unlockedCount = list.filter((x) => x.unlockedAt).length

  return { list, unlockedCount, total: achievements.length }
}
