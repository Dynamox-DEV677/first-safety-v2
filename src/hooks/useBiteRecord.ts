import type { BiteRecord } from '../data/bite'
import { readLS, useLocalStorage, writeLS } from './useLocalStorage'

/**
 * The bite record is written automatically as the patient moves through the NOW flow.
 * It records; it never interprets. Stays on this phone.
 */
export const BITE_KEY = 'fs.biteRecord'

export function emptyBite(biteAt: string): BiteRecord {
  return {
    biteAt,
    animal: 'unknown',
    animalKnown: '',
    bodyPart: '',
    brokeSkin: '',
    washStartedAt: '',
    washSeconds: 0,
    stepsCompleted: [],
  }
}

/** A new incident: called when the patient taps "I've been bitten". */
export function startBiteRecord(): void {
  writeLS(BITE_KEY, emptyBite(new Date().toISOString()))
}

/** Merge fields into the current record, creating one (with unknown bite time) if none exists. */
export function updateBiteRecord(patch: Partial<BiteRecord>): void {
  const current = readLS<BiteRecord | null>(BITE_KEY, null) ?? emptyBite('')
  writeLS(BITE_KEY, { ...current, ...patch })
}

export function markStepCompleted(step: number): void {
  const current = readLS<BiteRecord | null>(BITE_KEY, null) ?? emptyBite('')
  if (current.stepsCompleted.includes(step)) return
  writeLS(BITE_KEY, { ...current, stepsCompleted: [...current.stepsCompleted, step].sort((a, b) => a - b) })
}

/** Keep the longest wash actually timed. */
export function recordWashSeconds(seconds: number): void {
  const current = readLS<BiteRecord | null>(BITE_KEY, null) ?? emptyBite('')
  const rounded = Math.max(0, Math.round(seconds))
  if (rounded <= current.washSeconds) return
  writeLS(BITE_KEY, { ...current, washSeconds: rounded })
}

export function useBiteRecord(): BiteRecord | null {
  const [record] = useLocalStorage<BiteRecord | null>(BITE_KEY, null)
  return record
}
