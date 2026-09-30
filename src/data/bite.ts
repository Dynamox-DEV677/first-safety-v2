/**
 * Bite record - what the patient reports during the NOW flow.
 * This is a record, not an assessment. Nothing here is interpreted, scored or categorised.
 * Labels are hard-coded; every field is optional and prints as "Not recorded" when empty.
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

export interface BiteRecord {
  /** ISO timestamp set when the patient taps a start button. Empty if unknown. */
  biteAt: string
  animal: Animal
  animalKnown: YesNoUnsure | ''
  /** AREAS ids, every one the patient tapped. Empty if skipped. */
  areas: string[]
  /** CONTACT_TYPES ids, every one the patient tapped. Empty if skipped. */
  contact: string[]
  /** ISO timestamp when the wash timer was started. Empty if never started. */
  washStartedAt: string
  /** Seconds of washing actually timed. */
  washSeconds: number
  /** Step numbers the patient actually saw, recorded as each screen is shown. */
  stepsCompleted: number[]
  /** ISO timestamp when the patient reached the final "go to a hospital" screen. Empty until then. */
  completedAt: string
}

/** Where the injury is. Plain words; the doctor examines the wound, the app only says where to look. */
export const AREAS: { id: string; label: string }[] = [
  { id: 'head-face', label: 'Head or face' },
  { id: 'neck', label: 'Neck' },
  { id: 'hand-fingers', label: 'Hand or fingers' },
  { id: 'arm', label: 'Arm' },
  { id: 'torso', label: 'Chest, back or stomach' },
  { id: 'genitals', label: 'Private parts' },
  { id: 'leg', label: 'Leg' },
  { id: 'foot-toes', label: 'Foot or toes' },
  { id: 'other', label: 'Somewhere else' },
]

/**
 * What the animal did. `label` is what the patient taps; `clinical` is the wording of the same
 * item on the NCDC India animal-bite patient form (National Guidelines on Rabies Prophylaxis,
 * 2015, annexure), which is what the handover report prints so the doctor reads familiar terms.
 * The form groups these under WHO categories; the app deliberately does not.
 */
export const CONTACT_TYPES: { id: string; label: string; clinical: string }[] = [
  { id: 'lick-intact', label: 'Licked unbroken skin', clinical: 'Licks on intact skin' },
  { id: 'nibble', label: 'Nibbled bare skin', clinical: 'Nibbling of uncovered skin' },
  { id: 'scratch-nobleed', label: 'Scratched or grazed, no bleeding', clinical: 'Minor scratches or abrasions without bleeding' },
  { id: 'lick-broken', label: 'Licked a cut or wound', clinical: 'Licks on broken skin' },
  { id: 'bite-bleed', label: 'Bit and it bled', clinical: 'Single or multiple bites with bleeding' },
  { id: 'saliva-mucosa', label: 'Saliva in eyes, nose or mouth', clinical: 'Contamination of mucous membrane with saliva' },
  { id: 'unsure', label: 'Not sure', clinical: 'Not sure' },
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

export function areaLabel(id: string): string {
  return AREAS.find((a) => a.id === id)?.label ?? ''
}

export function contactLabel(id: string): string {
  return CONTACT_TYPES.find((c) => c.id === id)?.label ?? ''
}

export function contactClinical(id: string): string {
  return CONTACT_TYPES.find((c) => c.id === id)?.clinical ?? ''
}

export function yesNoUnsureLabel(v: YesNoUnsure | ''): string {
  return YES_NO_UNSURE.find((x) => x.id === v)?.label ?? ''
}
