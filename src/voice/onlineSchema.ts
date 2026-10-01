import type { Animal, Site } from '../data/bite'

/**
 * The only shape the optional online matcher may return (§8). Anything else - a field outside the
 * schema, a value outside an enum, confidence below 0.75, an "unclear" animal - is rejected and the
 * app falls back to its own tap list. Fail closed, always. No free text ever crosses this line.
 */
export const ONLINE_ANIMALS = ['dog', 'cat', 'monkey', 'rodent', 'bat', 'mongoose', 'livestock', 'human', 'unclear'] as const
export const ONLINE_SITES = ['head_neck', 'hand', 'arm', 'leg', 'body', 'multiple', 'unclear'] as const
/** Our own pre-written questions, by id. The matcher may only point at one of these. */
export const QUESTION_IDS = ['animal', 'site', 'broke_skin', 'bleeding', 'known', 'when', 'substances'] as const
export const MIN_CONFIDENCE = 0.75

export type QuestionId = (typeof QUESTION_IDS)[number]

export interface OnlineMatch {
  animal: Animal
  site: Site | null
  brokeSkin: boolean | null
  confidence: number
  nextQuestion: QuestionId | null
}

const KEYS = ['animal', 'site', 'broke_skin', 'confidence', 'nextQuestion']

export function validateMatch(x: unknown): OnlineMatch | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null
  const o = x as Record<string, unknown>
  const keys = Object.keys(o)
  if (keys.length !== KEYS.length || !KEYS.every((k) => keys.includes(k))) return null
  const { animal, site, broke_skin, confidence, nextQuestion } = o
  if (typeof animal !== 'string' || !(ONLINE_ANIMALS as readonly string[]).includes(animal) || animal === 'unclear') return null
  if (typeof site !== 'string' || !(ONLINE_SITES as readonly string[]).includes(site)) return null
  if (broke_skin !== null && typeof broke_skin !== 'boolean') return null
  if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null
  if (confidence < MIN_CONFIDENCE) return null
  if (nextQuestion !== null && (typeof nextQuestion !== 'string' || !(QUESTION_IDS as readonly string[]).includes(nextQuestion))) return null
  return {
    animal: animal as Animal,
    site: site === 'unclear' ? null : (site as Site),
    brokeSkin: broke_skin as boolean | null,
    confidence,
    nextQuestion: nextQuestion as QuestionId | null,
  }
}
