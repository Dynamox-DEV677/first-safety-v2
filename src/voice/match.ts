import type { Animal } from '../data/bite'

/**
 * Turns a transcript into taps. Deterministic word lists, nothing learned, nothing clever: this
 * only pre-fills the same buttons the patient could tap, and the patient confirms every one of
 * them on the next screens. Anything the words do not say stays unrecorded. It never produces a
 * category, a risk or an instruction.
 */
export interface VoiceMatch {
  animal: Animal | null
  areas: string[]
  contact: string[]
  /** A snake, insect or spider was named: out of scope, show the 108 line. */
  notMammal: boolean
}

const ANIMAL_WORDS: [Exclude<Animal, 'other' | 'unknown'>, RegExp][] = [
  ['dog', /\b(dogs?|pupp(y|ies)|pups?|kutta|kutte|naai|nai|kukur)\b/],
  ['cat', /\b(cats?|kittens?|billi|poonai|poona)\b/],
  ['monkey', /\b(monkeys?|langurs?|macaques?|bandar|korangu)\b/],
  ['rodent', /\b(rats?|mouse|mice|squirrels?|bandicoots?|chuha|eli)\b/],
  ['bat', /\b(bats?)\b/],
  ['mongoose', /\b(mongooses?|jackals?|fox(es)?|wol(f|ves)|hyenas?)\b/],
  ['livestock', /\b(cows?|buffalo(es)?|bulls?|ox|oxen|goats?|sheep|pigs?|horses?|donkeys?|camels?|calf|calves)\b/],
  ['human', /\b(person|people|man|woman|boy|girl|child|kid|human|somebody|someone|friend|brother|sister|classmate|student)\b/],
]

const AREA_WORDS: [string, RegExp][] = [
  ['head-face', /\b(head|face|cheeks?|lips?|nose|ears?|scalp|forehead|chin|eyes?|eyebrows?|jaw|mouth)\b/],
  ['neck', /\b(neck|throat)\b/],
  ['hand-fingers', /\b(hands?|fingers?|thumbs?|palms?|wrists?|knuckles?)\b/],
  ['arm', /\b(arms?|elbows?|shoulders?|forearms?|armpits?)\b/],
  ['torso', /\b((my|the|his|her|lower|upper|on the|in the) back|chest|stomach|belly|tummy|abdomen|waist|hips?|ribs?)\b/],
  ['genitals', /\b(private parts?|privates|genitals?|groin|penis|vagina|(my|the|his|her) bottom|buttocks?|bum)\b/],
  ['leg', /\b(legs?|knees?|thighs?|calf|calves|shins?|ankles?)\b/],
  ['foot-toes', /\b(foot|feet|toes?|heels?|soles?)\b/],
]

const NOT_MAMMAL = /\b(snakes?|cobras?|vipers?|kraits?|insects?|spiders?|scorpions?|bees?|wasps?|hornets?|centipedes?|mosquito(es)?)\b/
const STRAY = /\b(stray|street)\b/

const BIT = /\b(bit|bite|bites|bitten|biting|attacked|teeth)\b/
const BLEED = /\b(bleed|bleeds|bleeding|bled|blood|bloody)\b/
const NO_BLEED = /\b(no blood|not bleeding|(did not|didnt|didn t|never) bleed|without bleeding|no bleeding|not bleed)\b/
const SCRATCH = /\b(scratch|scratched|scratches|scratching|clawed|claws?|grazed?|abrasions?)\b/
const LICK = /\b(lick|licked|licks|licking|saliva|spit|drool|drooled|drooling)\b/
const BROKEN = /\b(cuts?|wounds?|open skin|broken skin|sores?|scabs?|blisters?)\b/
const MUCOSA = /\b(eyes?|nose|mouth|lips?)\b/
const NIBBLE = /\b(nibbled?|nibbling|nipped|nips?|mouthed|mouthing|gnawed?)\b/

function normalise(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()} `
}

export function matchTranscript(raw: string): VoiceMatch {
  const t = normalise(raw)

  // The animal named first wins; a person only counts when no animal is named ("my friend's dog").
  let animal: Animal | null = null
  let best = Number.POSITIVE_INFINITY
  let human = false
  for (const [id, re] of ANIMAL_WORDS) {
    const m = re.exec(t)
    if (!m) continue
    if (id === 'human') {
      human = true
      continue
    }
    if (m.index < best) {
      best = m.index
      animal = id
    }
  }
  if (!animal && human) animal = 'human'
  if (!animal && STRAY.test(t)) animal = 'dog'

  const areas = AREA_WORDS.filter(([, re]) => re.test(t)).map(([id]) => id)

  // Only the mappings that are exact go in; anything else is left for the patient to tap.
  const contact: string[] = []
  const bleeding = BLEED.test(t) && !NO_BLEED.test(t)
  if (BIT.test(t) && bleeding) contact.push('bite-bleed')
  if (SCRATCH.test(t) && !bleeding) contact.push('scratch-nobleed')
  if (LICK.test(t)) {
    if (MUCOSA.test(t)) contact.push('saliva-mucosa')
    if (BROKEN.test(t)) contact.push('lick-broken')
    if (!MUCOSA.test(t) && !BROKEN.test(t)) contact.push('lick-intact')
  }
  if (NIBBLE.test(t)) contact.push('nibble')

  return { animal, areas, contact, notMammal: NOT_MAMMAL.test(t) }
}
