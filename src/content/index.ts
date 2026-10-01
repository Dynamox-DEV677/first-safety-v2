/**
 * Sourced content and the verify gate.
 *
 * Every string that reaches the screen from here carries its source, URL, access date and a
 * verified flag. The files live in /content and are plain JSON so they can be reviewed without
 * reading code. Neither a model nor a developer writes clinical text: if the source does not say
 * it, it is not here, and if it is here but not yet reviewed, the gate hides it.
 *
 * THE LINE THIS MODULE MUST NEVER CROSS
 * The app never tells the user their WHO exposure category, how likely rabies is, whether they
 * need immunoglobulin, or that they will be fine. It shows what the sources say about an animal
 * or a site, verbatim, and it collects facts for the clinician. Do not "improve" this into a
 * diagnosis - a phone that gets it wrong either sends someone home to die or floods a clinic.
 */
import common from '../../content/common.json'
import situations from '../../content/situations.json'
import dog from '../../content/animals/dog.json'
import cat from '../../content/animals/cat.json'
import monkey from '../../content/animals/monkey.json'
import rodent from '../../content/animals/rodent.json'
import bat from '../../content/animals/bat.json'
import mongoose from '../../content/animals/mongoose.json'
import livestock from '../../content/animals/livestock.json'
import human from '../../content/animals/human.json'

export interface Sourced {
  id: string
  text: string
  source: string
  url: string
  /** ISO date the source was read. */
  accessed: string
  verified: boolean
}

export interface AnimalContent {
  id: string
  label: string
  /** Whether the source allows a 10-day observation of this animal (dogs and cats only). */
  observable10Days: boolean
  notes: Sourced[]
}

export type AnimalId = 'dog' | 'cat' | 'monkey' | 'rodent' | 'bat' | 'mongoose' | 'livestock' | 'human'

export const ANIMALS: Record<AnimalId, AnimalContent> = {
  dog, cat, monkey, rodent, bat, mongoose, livestock, human,
}

export const ANIMAL_ORDER: AnimalId[] = ['dog', 'cat', 'monkey', 'rodent', 'bat', 'mongoose', 'livestock', 'human']

export const COMMON: Sourced[] = common.notes

/**
 * Lines shown only when the recorded facts make them relevant: the bite site, a late start, saliva
 * in the eyes, nose or mouth, or something put on the wound. Selection is by fact, never by grade.
 */
export const SITUATION = {
  site: situations.site as Sourced[],
  late: situations.late as Sourced[],
  mucosa: situations.mucosa as Sourced[],
  applied: situations.applied as Sourced[],
}

/** Shown in place of any string whose verified flag is false. Keep this wording. */
export const GATE_MESSAGE = "This step hasn't been reviewed yet, so it isn't shown. Wash the wound and go to a hospital today."

export function isAnimalId(v: string): v is AnimalId {
  return (ANIMAL_ORDER as string[]).includes(v)
}

/** Only strings the gate lets through. */
export function verified(notes: Sourced[]): Sourced[] {
  return notes.filter((n) => n.verified)
}

/** How many strings the gate is holding back, so the UI can say so honestly. */
export function gatedCount(notes: Sourced[]): number {
  return notes.filter((n) => !n.verified).length
}

/** Out-of-scope line for non-mammals. Spec copy, not clinical content. */
export const NOT_A_MAMMAL = 'This app covers bites and scratches from mammals. For snakebite, call 108 now.'
