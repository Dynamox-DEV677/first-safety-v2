/**
 * Bite record - what the patient (or a bystander) reports during the NOW flow.
 * This is a record, not an assessment. Nothing here is interpreted, scored or categorised.
 * Labels are hard-coded; every field is optional and the handover report prints "Unknown" when a
 * field is empty, so the clinician knows to ask.
 *
 * The fields follow the clinic's own intake form: NCDC India, National Guidelines on Rabies
 * Prophylaxis (2015), Annexure 2, "Proforma for management of animal bite case at an antirabies
 * centre/clinic" - time of bite, site, species, pet/stray, the animal's vaccination, type of
 * exposure, and the remedy taken before coming to the clinic.
 */
export type Animal =
  | 'dog'
  | 'cat'
  | 'monkey'
  | 'rodent'
  | 'bat'
  | 'mongoose'
  | 'livestock'
  | 'human'
  | 'other'
  | 'unknown'
export type YesNoUnsure = 'yes' | 'no' | 'unsure'
export type Answer = YesNoUnsure | ''

/** The six sites of §6. Ids match the optional online matcher's schema (api/match.ts). */
export type Site = 'head_neck' | 'hand' | 'arm' | 'leg' | 'body' | 'multiple'

/** When the bite happened, as the patient told the app. '' = not asked. */
export type BiteEstimate = '' | 'now' | '10' | '30' | '60' | 'over60' | 'unsure'

export type Closure = '' | 'open' | 'bandaged' | 'stitched'

export interface BiteRecord {
  /** ISO time the incident was started in the app (either entry button). */
  openedAt: string
  /** Which entry button started it: red "Start the 15 minutes" or grey "Tell me what happened". */
  startedVia: '' | 'wash' | 'tell'
  /** ISO time of the bite as far as the app knows it. '' = unknown. */
  biteAt: string
  biteEstimate: BiteEstimate
  animal: Animal
  /** Can the animal be found again (pet or known) - the clinic's "Pet/Stray/Wild". */
  animalKnown: Answer
  /** Only asked when the animal is known. */
  animalVaccinated: Answer
  site: Site | ''
  /** CONTACT_TYPES ids, every one the patient tapped. */
  contact: string[]
  brokeSkin: Answer
  bleeding: Answer
  /** SUBSTANCES ids. ['none'] is a clean negative and is reported as one. */
  substances: string[]
  /** ISO time the substances answer was last changed - when the app was told, not when applied. */
  substancesAt: string
  closure: Closure
  /** Whether the person bitten is this phone's owner; decides if the saved profile applies. */
  patient: '' | 'me' | 'other'
  priorRabies: Answer
  priorTetanus: Answer
  /** ISO timestamp when the wash timer was started. Empty if never started. */
  washStartedAt: string
  /** Seconds of washing actually timed. */
  washSeconds: number
  /** Step numbers the patient actually saw, recorded as each screen is shown. */
  stepsCompleted: number[]
  /** ISO timestamp when the patient reached the final "go to a hospital" screen. Empty until then. */
  completedAt: string
}

export const SITES: { id: Site; label: string }[] = [
  { id: 'head_neck', label: 'Face / head / neck' },
  { id: 'hand', label: 'Hands or fingers' },
  { id: 'arm', label: 'Arms' },
  { id: 'leg', label: 'Legs or feet' },
  { id: 'body', label: 'Body' },
  { id: 'multiple', label: 'More than one place' },
]

/**
 * What the animal did. `label` is what the patient taps; `clinical` is the wording of the same
 * item on the NCDC intake form, which is what the handover report prints. The form groups these
 * under WHO categories; the app deliberately does not.
 */
export const CONTACT_TYPES: { id: string; label: string; clinical: string }[] = [
  { id: 'bite', label: 'Bit', clinical: 'Bite' },
  { id: 'scratch', label: 'Scratched', clinical: 'Scratch' },
  { id: 'nibble', label: 'Nibbled bare skin', clinical: 'Nibbling of uncovered skin' },
  { id: 'lick-broken', label: 'Licked a cut or wound', clinical: 'Licks on broken skin' },
  { id: 'lick-intact', label: 'Licked unbroken skin', clinical: 'Licks on intact skin' },
  { id: 'saliva-mucosa', label: 'Saliva in eyes, nose or mouth', clinical: 'Contamination of mucous membrane with saliva' },
]

/**
 * What was put on the wound before the clinic. The irritants are the ones NCDC names
 * (2019 p. 7: "chilies, oil, turmeric, lime, salt"; 2015 Annexure 2: "oil/salt/chilies/lime/herbs").
 */
export const SUBSTANCES: { id: string; label: string; irritant: boolean }[] = [
  { id: 'none', label: 'Nothing', irritant: false },
  { id: 'antiseptic', label: 'Antiseptic', irritant: false },
  { id: 'turmeric', label: 'Turmeric', irritant: true },
  { id: 'chilli', label: 'Chilli', irritant: true },
  { id: 'oil', label: 'Oil', irritant: true },
  { id: 'salt', label: 'Salt', irritant: true },
  { id: 'lime', label: 'Lime', irritant: true },
  { id: 'herbs', label: 'Herbs or paste', irritant: true },
  { id: 'other', label: 'Something else', irritant: true },
]

export const BITE_TIMES: { id: Exclude<BiteEstimate, ''>; label: string; minutes: number | null }[] = [
  { id: 'now', label: 'Just now', minutes: 0 },
  { id: '10', label: 'About 10 min ago', minutes: 10 },
  { id: '30', label: 'About 30 min ago', minutes: 30 },
  { id: '60', label: 'About 1 hour ago', minutes: 60 },
  { id: 'over60', label: 'More than 1 hour ago', minutes: null },
  { id: 'unsure', label: 'Not sure', minutes: null },
]

export const CLOSURES: { id: Exclude<Closure, ''>; label: string }[] = [
  { id: 'open', label: 'Left open' },
  { id: 'bandaged', label: 'Bandaged or covered' },
  { id: 'stitched', label: 'Stitched or taped' },
]

export const YES_NO_UNSURE: { id: YesNoUnsure; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'unsure', label: 'Not sure' },
]

export const ANIMAL_LABEL: Record<Animal, string> = {
  dog: 'Dog',
  cat: 'Cat',
  monkey: 'Monkey',
  rodent: 'Rat, mouse or squirrel',
  bat: 'Bat',
  mongoose: 'Mongoose or jackal',
  livestock: 'Cow, buffalo, goat or other livestock',
  human: 'Person',
  other: 'Another animal with fur',
  unknown: '',
}

export function siteLabel(id: string): string {
  return SITES.find((s) => s.id === id)?.label ?? ''
}

export function contactLabel(id: string): string {
  return CONTACT_TYPES.find((c) => c.id === id)?.label ?? ''
}

export function contactClinical(id: string): string {
  return CONTACT_TYPES.find((c) => c.id === id)?.clinical ?? ''
}

export function substanceLabel(id: string): string {
  return SUBSTANCES.find((s) => s.id === id)?.label ?? ''
}

export function yesNoUnsureLabel(v: Answer): string {
  return YES_NO_UNSURE.find((x) => x.id === v)?.label ?? ''
}

export function emptyBite(openedAt: string, startedVia: BiteRecord['startedVia'] = ''): BiteRecord {
  return {
    openedAt,
    startedVia,
    biteAt: openedAt,
    biteEstimate: '',
    animal: 'unknown',
    animalKnown: '',
    animalVaccinated: '',
    site: '',
    contact: [],
    brokeSkin: '',
    bleeding: '',
    substances: [],
    substancesAt: '',
    closure: '',
    patient: '',
    priorRabies: '',
    priorTetanus: '',
    washStartedAt: '',
    washSeconds: 0,
    stepsCompleted: [],
    completedAt: '',
  }
}

/** Fill in anything an older saved record lacks, so every reader can trust the shape. */
export function normaliseBite(raw: Partial<BiteRecord> | null | undefined): BiteRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const base = emptyBite(typeof raw.openedAt === 'string' ? raw.openedAt : (raw.biteAt ?? ''))
  const merged = { ...base, ...raw } as BiteRecord
  merged.contact = Array.isArray(raw.contact) ? raw.contact : []
  merged.substances = Array.isArray(raw.substances) ? raw.substances : []
  merged.stepsCompleted = Array.isArray(raw.stepsCompleted) ? raw.stepsCompleted : []
  if (!merged.openedAt) merged.openedAt = merged.biteAt
  return merged
}
