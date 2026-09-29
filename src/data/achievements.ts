/**
 * Achievements - unlocked by doing things in the app. Local only, no accounts, no sharing of data.
 * Text-only tiles; no icons, per the design brief.
 */
import type { Difficulty } from './quizzes'

export interface QuizAttempt {
  difficulty: Difficulty
  score: number
  total: number
  /** ISO date-time. */
  date: string
  name: string
}

export interface ProgressSnapshot {
  learnedCount: number
  bookmarksCount: number
  bestStreak: number
  quizAttempts: QuizAttempt[]
  /** How many of the six first-aid steps the patient actually saw. */
  stepsSeen: number
  finalSeen: boolean
  timerDone: boolean
  dosesLogged: number
}

export interface Achievement {
  id: string
  title: string
  desc: string
  check: (s: ProgressSnapshot) => boolean
}

export const achievements: Achievement[] = [
  {
    id: 'walkthrough',
    title: 'Knows the drill',
    desc: 'Went through all six first-aid steps.',
    // Keyed on the six steps themselves. finalSeen is kept as an alternative so anyone who
    // unlocked this before the fix, or who lands on the hospital screen directly, still counts.
    check: (s) => s.stepsSeen >= 6 || s.finalSeen,
  },
  {
    id: 'timer',
    title: 'Fifteen full minutes',
    desc: 'Ran the wash timer all the way to zero.',
    check: (s) => s.timerDone,
  },
  {
    id: 'cards-10',
    title: 'Myth buster',
    desc: 'Learned 10 cards.',
    check: (s) => s.learnedCount >= 10,
  },
  {
    id: 'cards-25',
    title: 'Half way',
    desc: 'Learned 25 cards.',
    check: (s) => s.learnedCount >= 25,
  },
  {
    id: 'cards-50',
    title: 'Knows it all',
    desc: 'Learned every card.',
    check: (s) => s.learnedCount >= 50,
  },
  {
    id: 'quiz-1',
    title: 'First quiz',
    desc: 'Finished a quiz at any difficulty.',
    check: (s) => s.quizAttempts.length >= 1,
  },
  {
    id: 'perfect',
    title: 'Perfect score',
    desc: 'Answered every question in a quiz correctly.',
    check: (s) => s.quizAttempts.some((a) => a.total > 0 && a.score === a.total),
  },
  {
    id: 'hard-ace',
    title: 'Hard mode',
    desc: 'Scored 13 or more out of 15 on Hard.',
    check: (s) => s.quizAttempts.some((a) => a.difficulty === 'hard' && a.score >= 13),
  },
  {
    id: 'streak-3',
    title: 'Three days running',
    desc: 'Learned something on 3 days in a row.',
    check: (s) => s.bestStreak >= 3,
  },
  {
    id: 'streak-7',
    title: 'A full week',
    desc: 'Learned something on 7 days in a row.',
    check: (s) => s.bestStreak >= 7,
  },
  {
    id: 'bookmarks-5',
    title: 'Collector',
    desc: 'Bookmarked 5 facts.',
    check: (s) => s.bookmarksCount >= 5,
  },
  {
    id: 'vaccine-log',
    title: 'On schedule',
    desc: 'Logged a vaccine dose in the tracker.',
    check: (s) => s.dosesLogged >= 1,
  },
]
