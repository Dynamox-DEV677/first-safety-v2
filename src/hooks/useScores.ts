import { useCallback, useMemo } from 'react'
import type { QuizAttempt } from '../data/achievements'
import type { Difficulty } from '../data/quizzes'
import { useLocalStorage } from './useLocalStorage'

/**
 * Quiz attempts and the leaderboard. Everything lives on this phone only: there is no server,
 * so the "leaderboard" is the top scores recorded on this device (family, classmates, you).
 */
export function useScores() {
  const [attempts, setAttempts] = useLocalStorage<QuizAttempt[]>('fs.scores', [])
  const [name, setName] = useLocalStorage<string>('fs.name', '')

  const add = useCallback(
    (a: QuizAttempt) => setAttempts((prev) => [...prev, a].slice(-200)),
    [setAttempts],
  )

  const top = useMemo(
    () =>
      [...attempts]
        .sort((x, y) => y.score / y.total - x.score / x.total || y.score - x.score || y.date.localeCompare(x.date))
        .slice(0, 10),
    [attempts],
  )

  const bestFor = useCallback(
    (d: Difficulty): QuizAttempt | undefined =>
      attempts.filter((a) => a.difficulty === d).sort((x, y) => y.score - x.score)[0],
    [attempts],
  )

  return { attempts, top, add, bestFor, name, setName }
}

export function shareText(a: QuizAttempt): string {
  return `I scored ${a.score}/${a.total} on the ${a.difficulty} rabies quiz in First Safety. Do you know what to do after a dog bite?`
}
