/**
 * NOW mode - the first 15 minutes after an animal bite.
 *
 * MEDICAL SAFETY: every step below is hard-coded from WHO and India NCDC post-exposure guidance.
 * Do not let any model or script generate, reorder or reword these steps.
 * Sources are listed per step and shown in the app.
 */
import type { SourceId } from './sources'

export interface Step {
  id: number
  /** Short imperative title, shown very large. */
  title: string
  /** One or two plain sentences. */
  instruction: string
  /** Optional extra plain-language detail. */
  detail?: string
  /** Things NOT to do at this step. */
  donts?: string[]
  /** A common myth and the fact that replaces it. */
  mythBuster?: { myth: string; fact: string }
  /** Countdown in seconds, only for the washing step. */
  timerSeconds?: number
  /** Real tel: links shown on this step. */
  calls?: { number: string; label: string; note?: string }[]
  critical: boolean
  sources: SourceId[]
}

export const WASH_SECONDS = 15 * 60

export const HOSPITAL_LINE = 'After first aid: go to a hospital for the anti-rabies vaccine today.'

export const steps: Step[] = [
  {
    id: 1,
    title: 'Wash the wound now',
    instruction: 'Hold the bite under running water and rub soap in and around it. Keep washing for 15 full minutes.',
    detail:
      'Use any soap. Keep the water running the whole time. If there is no soap, wash with running water alone for 15 minutes. Do not stop early, even if it stings.',
    donts: ['Do not put chilli powder, turmeric, oil, lime, mud, ash or herbs on the wound.'],
    mythBuster: {
      myth: '"Turmeric or chilli on the bite will kill the germs."',
      fact: 'No. These do not kill the rabies virus and they damage the wound. NCDC says do not apply irritants. Soap and running water flush the virus out – that is why 15 minutes matters.',
    },
    timerSeconds: WASH_SECONDS,
    critical: true,
    sources: ['WHO_FS', 'NCDC_2019'],
  },
  {
    id: 2,
    title: 'Apply antiseptic',
    instruction: 'After washing, dab povidone-iodine (Betadine) or 70% alcohol (spirit) on the wound.',
    detail: 'If you have neither, skip this step. Do not spend time searching for it – getting to a hospital matters more.',
    critical: false,
    sources: ['NCDC_2019'],
  },
  {
    id: 3,
    title: 'Do not close the wound',
    instruction: 'Do not stitch, tape or bandage it tightly. Leave it open, or cover it loosely with a clean cloth.',
    detail: 'Closing a bite traps the virus and bacteria inside. If stitches are ever needed, a doctor does that later.',
    donts: ['No tight bandage.', 'No glue, tape or stitches.'],
    critical: true,
    sources: ['NCDC_2019', 'WHO_TRS'],
  },
  {
    id: 4,
    title: 'Do not tie, cut or burn',
    instruction: 'Do not tie a cloth or tourniquet above the bite. Do not cut, suck or burn the wound.',
    detail: 'Rabies is not a poison you can squeeze or draw out. These things only cause more damage and waste time.',
    donts: ['No tourniquet.', 'No cutting or sucking the wound.', 'No burning or hot objects.'],
    critical: true,
    sources: ['NCDC_2019'],
  },
  {
    id: 5,
    title: 'Tell an adult and get help',
    instruction: 'Tell a parent, teacher or any adult right now – even if the bite is small, even if you are scared of getting into trouble.',
    detail: 'If no adult is nearby, call 112. Four in ten people bitten by suspected rabid animals are children under 15. A small bite still needs the vaccine.',
    mythBuster: {
      myth: '"It was only a small bite from a puppy, I do not need to tell anyone."',
      fact: 'Puppies can carry rabies too. Any bite that breaks the skin needs a doctor today. Telling an adult is the step that saves lives.',
    },
    calls: [{ number: '112', label: 'Emergency', note: 'All India, any phone, free.' }],
    critical: true,
    sources: ['WHO_FS', 'GOI_112'],
  },
  {
    id: 6,
    title: 'Go to a hospital today',
    instruction: 'You need the anti-rabies vaccine today. Go to the nearest government hospital or Anti-Rabies Clinic.',
    detail:
      'The vaccine is called post-exposure prophylaxis (PEP). Do not wait to see whether the animal gets sick.',
    mythBuster: {
      myth: '"The dog looked healthy, so I do not need the vaccine."',
      fact: 'An animal can spread rabies for days before it looks sick. Start the vaccine today. If a dog or cat can be watched and is still healthy after 10 days, the doctor may stop the course – but only the doctor decides that.',
    },
    calls: [
      { number: '112', label: 'Emergency', note: 'All India, any phone, free.' },
      { number: '108', label: 'Ambulance', note: 'Coverage varies by state.' },
    ],
    critical: true,
    sources: ['WHO_FS', 'WHO_TRS', 'NCDC_2019'],
  },
]

export type DogKnown = 'known' | 'unknown'

export const triage = {
  question: 'Do you know the animal?',
  help: 'Both answers lead to the same first aid. Your answer only changes what to tell the doctor. If you are near a tap, the next screen starts the wash timer.',
  options: [
    { value: 'known' as DogKnown, label: 'Yes', sub: 'A pet, or one I can find again' },
    { value: 'unknown' as DogKnown, label: 'No', sub: 'A stray or wild one, or I cannot find it' },
  ],
  notes: {
    known:
      'Start treatment today anyway. Tell the doctor whether the animal is vaccinated. If it is a dog or cat, someone should watch it for 10 days – if it stays healthy the doctor may stop the vaccine course. Never wait those 10 days before starting.',
    unknown:
      'Start treatment today and complete the full course. Tell the doctor you could not identify the animal, and whether it was behaving strangely – aggressive, drooling, or unusually quiet.',
  } satisfies Record<DogKnown, string>,
  sources: ['WHO_FS', 'WHO_TRS', 'NCDC_2019'] as SourceId[],
}

/** WHO exposure categories in plain language - for the "what to tell the doctor" section. */
export const exposureCategories = {
  intro: 'The doctor decides the category. Describe the bite honestly.',
  items: [
    {
      cat: 'I',
      what: 'You touched or fed the animal, or it licked unbroken skin.',
      action: 'No vaccine needed. Wash the area anyway.',
    },
    {
      cat: 'II',
      what: 'It nibbled bare skin, or left a small scratch with no bleeding.',
      action: 'Vaccine needed today.',
    },
    {
      cat: 'III',
      what: 'A bite or scratch that broke the skin or bled. A lick on a wound, or on the eyes, nose or mouth. Any contact with a bat.',
      action: 'Vaccine today, plus rabies immunoglobulin around the wound.',
    },
  ],
  sources: ['WHO_TRS', 'WHO_FS'] as SourceId[],
}

export interface Helpline {
  number: string
  label: string
  note: string
  sources: SourceId[]
}

export const helplines: Helpline[] = [
  { number: '112', label: 'Emergency', note: 'All India, any phone, free.', sources: ['GOI_112'] },
  { number: '108', label: 'Ambulance', note: 'Coverage varies by state. Free where it runs.', sources: ['GOI_112'] },
  {
    number: '104',
    label: 'Health helpline',
    note: 'Coverage varies by state. Ask where the nearest anti-rabies vaccine is.',
    sources: ['GOI_112'],
  },
]

export interface Hospital {
  state: string
  city: string
  name: string
  phone: string
  /** Who verified this entry and when, e.g. "State health dept website, 2026-09-01". */
  verified: string
}

/**
 * Verified anti-rabies (PEP) centres by state.
 * INTENTIONALLY EMPTY until each entry is verified by a person against an official source.
 * Never add a hospital or phone number here that you have not checked yourself.
 */
export const hospitals: Hospital[] = []

export type VaccineAvailability = 'free' | 'paid' | 'unverified'

export interface VaccineInfo {
  status: VaccineAvailability
  /** Where it was checked, e.g. "State health dept circular, 2026-09-01". Empty until verified. */
  verified: string
  note: string
}

/**
 * Free-vaccine availability by state.
 * Every state starts as "unverified". Change a state only after checking with its health
 * department, and record where you checked in `verified`.
 */
export const vaccineInfo: Record<string, VaccineInfo> = {}

export function vaccineInfoFor(state: string): VaccineInfo {
  return (
    vaccineInfo[state] ?? {
      status: 'unverified',
      verified: '',
      note: 'Not verified for this state yet. Call 104 or ask at the nearest government hospital whether the vaccine is free.',
    }
  )
}

export const hospitalFallback =
  'Go to the nearest Government District Hospital, Medical College hospital, or Primary / Community Health Centre. They run Anti-Rabies Clinics and stock the vaccine.'

export const INDIAN_STATES: string[] = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]
