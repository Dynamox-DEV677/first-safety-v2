/**
 * Prep panel shown under the wash timer on step 1.
 *
 * RULE: never instruct the washing person to leave the tap. Every line is addressed to a helper,
 * or to "when the timer ends". Only things likely already in the house. Nothing is required, and
 * missing items must never read as failure. Hard-coded strings only.
 *
 * Blocks reveal as the countdown passes each mark and stay visible afterwards.
 */
import type { SourceId } from './sources'

export interface PrepItem {
  text: string
  /** Appends a real tel: link after the text, e.g. "Emergency number" + 112. */
  tel?: string
}

export interface PrepBlock {
  id: string
  /** Reveal when the remaining time is at or below this many seconds. */
  atRemainingSeconds: number
  title: string
  items: PrepItem[]
  note?: string
  link?: { label: string; to: string; note: string }
}

export const prepBlocks: PrepBlock[] = [
  {
    id: 'bring',
    atRemainingSeconds: 12 * 60,
    title: 'Ask someone to bring',
    items: [
      { text: 'Povidone-iodine (Betadine) or spirit, only if it is already at home' },
      { text: 'A clean cloth or gauze, to cover loosely later' },
    ],
    note: 'If you do not have these, that is fine. Soap and water is the step that matters.',
  },
  {
    id: 'refuse',
    atRemainingSeconds: 9 * 60,
    title: 'Do not let anyone bring',
    items: [
      { text: 'Turmeric, chilli, oil, lime, mud, ash or herbs' },
      { text: 'Bandage, tape, glue or thread to close the wound' },
      { text: 'Needle, blade or anything hot' },
    ],
    note: 'If someone is offering these, show them this screen.',
  },
  {
    id: 'ready',
    atRemainingSeconds: 6 * 60,
    title: 'Ready for the hospital',
    items: [
      { text: 'Phone charged. Emergency number', tel: '112' },
      { text: 'Dates of any earlier rabies or tetanus injections' },
      { text: 'An adult to come with you' },
      { text: 'Money or transport to the nearest government hospital' },
    ],
    link: {
      label: "Fill in the doctor's form while you wait",
      to: '/report',
      note: 'A helper can fill this in on another phone, or the patient after washing.',
    },
  },
  {
    id: 'almost',
    atRemainingSeconds: 3 * 60,
    title: 'Almost done',
    items: [{ text: 'Keep washing. The last minutes count as much as the first.' }],
  },
]

export const PREP_SOURCES: SourceId[] = ['NCDC_2019', 'WHO_FS']

/** "12:00" style label for a mark. */
export function markLabel(seconds: number): string {
  const m = Math.floor(seconds / 60)
  return `${String(m).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
