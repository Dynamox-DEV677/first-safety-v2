import { readLS, writeLS } from './useLocalStorage'

/** One-time events used by achievements. Stores the first time each happened. */
export type Flags = Partial<Record<'finalSeen' | 'timerDone', string>>

export const FLAGS_KEY = 'fs.flags'

export function setFlag(name: keyof Flags): void {
  const flags = readLS<Flags>(FLAGS_KEY, {})
  if (!flags[name]) writeLS(FLAGS_KEY, { ...flags, [name]: new Date().toISOString() })
}
