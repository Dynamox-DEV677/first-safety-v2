import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

interface Streak {
  /** Local date "YYYY-MM-DD" of the last day something was learned. */
  last: string
  count: number
  /** Longest streak ever reached on this phone. */
  best: number
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function today(): string {
  return localDate(new Date())
}

function yesterday(): string {
  return localDate(new Date(Date.now() - 86_400_000))
}

function bump(s: Streak): Streak {
  const t = today()
  if (s.last === t) return s
  const count = s.last === yesterday() ? s.count + 1 : 1
  return { last: t, count, best: Math.max(s.best ?? 0, count) }
}

function visibleStreak(s: Streak): number {
  return s.last === today() || s.last === yesterday() ? s.count : 0
}

/** Learned cards, bookmarks and the day streak. All local, nothing leaves the phone. */
export function useLearnProgress() {
  const [learned, setLearned] = useLocalStorage<Record<string, true>>('fs.learned', {})
  const [bookmarks, setBookmarks] = useLocalStorage<number[]>('fs.bookmarks', [])
  const [streak, setStreak] = useLocalStorage<Streak>('fs.streak', { last: '', count: 0, best: 0 })

  const isLearned = useCallback((id: number) => Boolean(learned[String(id)]), [learned])
  const isBookmarked = useCallback((id: number) => bookmarks.includes(id), [bookmarks])

  const toggleLearned = useCallback(
    (id: number) => {
      const turningOn = !learned[String(id)]
      setLearned((prev) => {
        const next = { ...prev }
        if (turningOn) next[String(id)] = true
        else delete next[String(id)]
        return next
      })
      if (turningOn) setStreak((prev) => bump(prev))
    },
    [learned, setLearned, setStreak],
  )

  const toggleBookmark = useCallback(
    (id: number) => {
      setBookmarks((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    },
    [setBookmarks],
  )

  return {
    learnedCount: Object.keys(learned).length,
    bookmarks,
    currentStreak: visibleStreak(streak),
    bestStreak: Math.max(streak.best ?? 0, streak.count ?? 0),
    isLearned,
    isBookmarked,
    toggleLearned,
    toggleBookmark,
  }
}
