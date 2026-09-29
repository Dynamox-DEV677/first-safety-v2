/**
 * Bite record - what the patient reports during the NOW flow.
 * This is a record, not an assessment. Nothing here is interpreted, scored or categorised.
 * Labels are hard-coded; every field is optional and prints as "Not recorded" when empty.
 */
export type Animal = 'dog' | 'cat' | 'monkey' | 'other' | 'unknown'
export type YesNoUnsure = 'yes' | 'no' | 'unsure'

export interface BiteRecord {
  /** ISO timestamp set when the patient taps "I've been bitten". Empty if unknown. */
  biteAt: string
  animal: Animal
  animalKnown: YesNoUnsure | ''
  /** One of BODY_PARTS ids, or '' if skipped. */
  bodyPart: string
  brokeSkin: YesNoUnsure | ''
  /** ISO timestamp when the wash timer was started. Empty if never started. */
  washStartedAt: string
  /** Seconds of washing actually timed. */
  washSeconds: number
  /** Step numbers the patient actually saw, recorded as each screen is shown. */
  stepsCompleted: number[]
}

export const BODY_PARTS: { id: string; label: string }[] = [
  { id: 'hand-arm', label: 'Hand or arm' },
  { id: 'leg-foot', label: 'Leg or foot' },
  { id: 'face-head', label: 'Face or head' },
  { id: 'torso', label: 'Chest, back or stomach' },
  { id: 'neck', label: 'Neck' },
  { id: 'other', label: 'Somewhere else' },
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
  other: 'Other animal',
  unknown: '',
}

export function bodyPartLabel(id: string): string {
  return BODY_PARTS.find((b) => b.id === id)?.label ?? ''
}

export function yesNoUnsureLabel(v: YesNoUnsure | ''): string {
  return YES_NO_UNSURE.find((x) => x.id === v)?.label ?? ''
}
