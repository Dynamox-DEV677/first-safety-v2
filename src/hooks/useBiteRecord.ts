import { BITE_TIMES, emptyBite, normaliseBite, type BiteEstimate, type BiteRecord } from '../data/bite'
import { readLS, useLocalStorage, writeLS } from './useLocalStorage'

/**
 * The bite record is written automatically as the patient moves through the NOW flow.
 * It records; it never interprets. Stays on this phone.
 */
export const BITE_KEY = 'fs.biteRecord'
export { emptyBite }

function current(): BiteRecord {
  return normaliseBite(readLS<Partial<BiteRecord> | null>(BITE_KEY, null)) ?? emptyBite('')
}

/** A new incident: called by either entry button. */
export function startBiteRecord(startedVia: BiteRecord['startedVia'] = ''): void {
  writeLS(BITE_KEY, emptyBite(new Date().toISOString(), startedVia))
}

/** Merge fields into the current record, creating one (with unknown times) if none exists. */
export function updateBiteRecord(patch: Partial<BiteRecord>): void {
  writeLS(BITE_KEY, { ...current(), ...patch })
}

/**
 * When the bite happened, measured back from when the incident was opened in the app. "More than
 * an hour" and "Not sure" leave the time unknown rather than inventing one.
 */
export function setBiteEstimate(estimate: BiteEstimate): void {
  const rec = current()
  const base = Date.parse(rec.openedAt)
  const minutes = BITE_TIMES.find((t) => t.id === estimate)?.minutes
  const biteAt =
    Number.isFinite(base) && typeof minutes === 'number' ? new Date(base - minutes * 60_000).toISOString() : ''
  writeLS(BITE_KEY, { ...rec, biteEstimate: estimate, biteAt })
}

export function markStepCompleted(step: number): void {
  const rec = current()
  if (rec.stepsCompleted.includes(step)) return
  writeLS(BITE_KEY, { ...rec, stepsCompleted: [...rec.stepsCompleted, step].sort((a, b) => a - b) })
}

/**
 * Add or remove one id in a list field. Reads the record at call time, not at render time, so two
 * quick taps never overwrite each other. For substances, "Nothing" and any substance exclude each
 * other, and the time of the answer is kept (it is when the app was told, not when it was applied).
 */
export function toggleBiteListItem(key: 'contact' | 'substances', id: string): void {
  const rec = current()
  const list = rec[key] ?? []
  let next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
  const patch: Partial<BiteRecord> = {}
  if (key === 'substances') {
    if (id === 'none' && next.includes('none')) next = ['none']
    else if (id !== 'none') next = next.filter((x) => x !== 'none')
    patch.substancesAt = new Date().toISOString()
  }
  writeLS(BITE_KEY, { ...rec, ...patch, [key]: next })
}

/** Keep the longest wash actually timed. */
export function recordWashSeconds(seconds: number): void {
  const rec = current()
  const rounded = Math.max(0, Math.round(seconds))
  if (rounded <= rec.washSeconds) return
  writeLS(BITE_KEY, { ...rec, washSeconds: rounded })
}

/** The patient reached the final "go to a hospital" screen. Set once; a revisit does not move it. */
export function markBiteComplete(): void {
  const rec = current()
  if (rec.completedAt) return
  writeLS(BITE_KEY, { ...rec, completedAt: new Date().toISOString() })
}

/** "New incident": forget this bite. The medical profile and contacts belong to the phone's owner and stay. */
export function clearBiteRecord(): void {
  writeLS(BITE_KEY, null)
}

export function useBiteRecord(): BiteRecord | null {
  const [record] = useLocalStorage<Partial<BiteRecord> | null>(BITE_KEY, null)
  return normaliseBite(record)
}
