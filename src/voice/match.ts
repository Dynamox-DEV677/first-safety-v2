import type { Animal, Site } from '../data/bite'

/**
 * Turns what someone said or typed into taps. An explicit synonym table, nothing learned: English,
 * Hinglish and Hindi, and Tamil, in the spellings people actually use. It only pre-fills the same
 * buttons the patient could tap, and every one is shown back for confirmation. Anything the words
 * do not say stays unrecorded. It never produces a category, a risk or an instruction.
 */
export interface VoiceMatch {
  /** Set only when exactly one animal was named (a person counts only if no animal was). */
  animal: Animal | null
  /** When the words were ambiguous: the two or three likeliest animals, first-mentioned first. */
  candidates: Animal[]
  confident: boolean
  site: Site | null
  contact: string[]
  brokeSkin: boolean | null
  bleeding: boolean | null
  /** A snake, insect or spider was named: out of scope, show the 108 line. */
  notMammal: boolean
  /** "I'm at the hospital", "we reached the clinic" - open the handover report. */
  atClinic: boolean
}

type Species = Exclude<Animal, 'other' | 'unknown'>

const ANIMALS: [Species, string[]][] = [
  ['dog', ['dog', 'dogs', 'puppy', 'puppies', 'pup', 'pups', 'doggy', 'doggie', 'kutta', 'kutte', 'kuta', 'kutti', 'kuttiya', 'kutiya', 'kutha', 'kukur', 'kukkur', 'naai', 'naay', 'naaye', 'stray dog', 'street dog', 'कुत्ता', 'कुत्ते', 'कुत्तिया', 'நாய்']],
  ['cat', ['cat', 'cats', 'kitten', 'kittens', 'kitty', 'billi', 'billa', 'bili', 'poonai', 'punai', 'பூனை', 'बिल्ली']],
  ['monkey', ['monkey', 'monkeys', 'langur', 'langurs', 'macaque', 'bandar', 'bander', 'bandor', 'korangu', 'kurangu', 'बंदर', 'லங்கூர்', 'குரங்கு']],
  ['rodent', ['rat', 'rats', 'mouse', 'mice', 'squirrel', 'squirrels', 'bandicoot', 'chuha', 'chooha', 'chuhe', 'choohe', 'gilahri', 'gilheri', 'eli', 'चूहा', 'चूहे', 'गिलहरी', 'எலி', 'அணில்']],
  ['bat', ['bat', 'bats', 'chamgadar', 'chamgadad', 'chamgaadar', 'vavval', 'vowal', 'चमगादड़', 'வௌவால்']],
  ['mongoose', ['mongoose', 'mongooses', 'jackal', 'jackals', 'fox', 'foxes', 'wolf', 'wolves', 'hyena', 'nevla', 'neola', 'siyar', 'gidar', 'keeri', 'nari', 'नेवला', 'सियार', 'गीदड़', 'கீரி', 'நரி']],
  ['livestock', ['cow', 'cows', 'buffalo', 'buffaloes', 'bull', 'ox', 'oxen', 'goat', 'goats', 'sheep', 'pig', 'pigs', 'horse', 'horses', 'donkey', 'camel', 'calf', 'gaay', 'gai', 'bhains', 'bhes', 'bakri', 'bakra', 'bail', 'saand', 'maadu', 'aadu', 'गाय', 'भैंस', 'बकरी', 'बैल', 'सांड', 'மாடு', 'ஆடு']],
  ['human', ['person', 'man', 'woman', 'boy', 'girl', 'child', 'kid', 'human', 'someone', 'somebody', 'friend', 'brother', 'sister', 'classmate', 'aadmi', 'insaan', 'bachcha', 'ladka', 'ladki', 'आदमी', 'इंसान', 'बच्चा']],
]

const SITE_WORDS: [Exclude<Site, 'multiple'>, string[]][] = [
  ['head_neck', ['head', 'face', 'cheek', 'cheeks', 'lip', 'lips', 'nose', 'ear', 'ears', 'eye', 'eyes', 'forehead', 'chin', 'neck', 'throat', 'scalp', 'jaw', 'chehra', 'chehre', 'gardan', 'gala', 'naak', 'kaan', 'aankh', 'mugam', 'kazhuthu', 'सिर', 'चेहरा', 'चेहरे', 'गर्दन', 'गला', 'नाक', 'कान', 'आँख', 'முகம்', 'கழுத்து', 'தலை']],
  ['hand', ['hand', 'hands', 'finger', 'fingers', 'thumb', 'palm', 'wrist', 'knuckle', 'knuckles', 'haath', 'hath', 'ungli', 'ungliyan', 'angootha', 'kalai', 'हाथ', 'उंगली', 'अंगूठा', 'கை', 'விரல்']],
  ['arm', ['arm', 'arms', 'elbow', 'forearm', 'shoulder', 'bazu', 'baazu', 'banh', 'kohni', 'kandha', 'बाजू', 'बांह', 'कोहनी', 'कंधा', 'தோள்']],
  ['leg', ['leg', 'legs', 'knee', 'knees', 'thigh', 'calf', 'shin', 'ankle', 'foot', 'feet', 'toe', 'toes', 'heel', 'sole', 'paer', 'paon', 'pao', 'taang', 'tang', 'ghutna', 'ghutne', 'jangh', 'edi', 'kaal', 'पैर', 'टांग', 'घुटना', 'जांघ', 'एड़ी', 'पाँव', 'கால்']],
  ['body', ['my back', 'the back', 'his back', 'her back', 'lower back', 'upper back', 'chest', 'stomach', 'belly', 'tummy', 'abdomen', 'waist', 'hip', 'hips', 'ribs', 'peeth', 'kamar', 'chaati', 'chhati', 'पेट', 'पीठ', 'कमर', 'छाती', 'முதுகு', 'வயிறு']],
]
const MANY_PLACES = ['many places', 'several places', 'everywhere', 'all over', 'multiple places', 'more than one place', 'kai jagah']

const BITE = ['bit', 'bite', 'bites', 'bitten', 'biting', 'teeth', 'kaata', 'kaat', 'kata', 'kaat liya', 'kat liya', 'kadi', 'kadichu', 'kadichiduchu', 'काटा', 'काट', 'கடி', 'கடித்தது']
const SCRATCH = ['scratch', 'scratched', 'scratches', 'clawed', 'claw', 'claws', 'kharoch', 'kharonch', 'panja', 'nakhun', 'nakhoon', 'खरोंच', 'नाखून', 'பிராண்டு']
const LICK = ['lick', 'licked', 'licks', 'licking', 'chaata', 'chata', 'chaat', 'चाटा', 'நக்கு']
const SALIVA = ['saliva', 'spit', 'drool', 'drooled', 'lar', 'thook', 'लार', 'थूक', 'எச்சில்']
const MUCOSA = ['eye', 'eyes', 'nose', 'mouth', 'lips', 'aankh', 'naak', 'munh', 'muh', 'आँख', 'नाक', 'मुँह', 'கண்', 'வாய்']
const NIBBLE = ['nibble', 'nibbled', 'nibbling', 'nip', 'nipped', 'gnawed', 'mouthed']
const BROKEN_WORDS = ['cut', 'cuts', 'wound', 'wounds', 'sore', 'scab', 'open skin', 'broken skin', 'ghav', 'zakhm', 'घाव', 'ज़ख्म', 'காயம்']
const INTACT_WORDS = ['unbroken', 'intact', 'no cut', 'no wound', 'skin is fine', 'skin was fine']

const SKIN_YES = ['broke the skin', 'broken skin', 'skin broke', 'skin is broken', 'skin was broken', 'deep', 'torn', 'ripped', 'puncture', 'teeth went in', 'teeth marks']
const SKIN_NO = ['did not break', 'didnt break', 'didn t break', 'not broken', 'no break', 'unbroken', 'skin is fine', 'skin was fine', 'intact']
const BLEED_YES = ['bleed', 'bleeding', 'bled', 'blood', 'bloody', 'khoon', 'khun', 'खून', 'ரத்தம்', 'இரத்தம்']
const BLEED_NO = ['no blood', 'not bleeding', 'did not bleed', 'didnt bleed', 'didn t bleed', 'no bleeding', 'without bleeding', 'not bled', 'khoon nahi', 'khoon nahin', 'खून नहीं']

const NOT_MAMMAL = ['snake', 'snakes', 'cobra', 'viper', 'krait', 'insect', 'insects', 'spider', 'spiders', 'scorpion', 'bee', 'bees', 'wasp', 'hornet', 'centipede', 'mosquito', 'saanp', 'sanp', 'naag', 'bichhu', 'bichu', 'makdi', 'paambu', 'thel', 'सांप', 'साँप', 'बिच्छू', 'मकड़ी', 'பாம்பு', 'தேள்']
const PLACE = ['hospital', 'clinic', 'aaspatal', 'aspatal', 'dispensary', 'अस्पताल', 'மருத்துவமனை']
const ARRIVED = ['at the', 'at', 'reached', 'in the', 'here', 'arrived', 'pahunch', 'pahuch', 'aa gaye', 'aagaye', 'pohoch', 'पहुँच', 'पहुंच', 'में', 'vandhutten', 'vandhuttom', 'வந்துட்டேன்']

/** Lower-case, punctuation to spaces, space-padded - keeps Devanagari and Tamil letters and signs. */
export function normalise(text: string): string {
  const cleaned = text
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9ऀ-ॿ஀-௿\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return ` ${cleaned} `
}

/** Position of the first whole-word (or whole-phrase) match, or -1. */
function find(t: string, words: string[]): number {
  let best = -1
  for (const w of words) {
    const i = t.indexOf(` ${w} `)
    if (i >= 0 && (best < 0 || i < best)) best = i
  }
  return best
}
const has = (t: string, words: string[]) => find(t, words) >= 0

export function matchTranscript(raw: string): VoiceMatch {
  const t = normalise(raw)

  // Animals in order of first mention. A person only counts if no animal is named ("my friend's dog").
  const named = ANIMALS.map(([id, words]) => ({ id, at: find(t, words) }))
    .filter((a) => a.at >= 0)
    .sort((a, b) => a.at - b.at)
  const animals = named.filter((a) => a.id !== 'human')
  let animal: Animal | null = null
  let candidates: Animal[] = []
  if (animals.length === 1) animal = animals[0].id
  else if (animals.length > 1) candidates = animals.slice(0, 3).map((a) => a.id)
  else if (named.length === 1) animal = 'human'
  if (!animal && !candidates.length && has(t, ['stray', 'street', 'aawara', 'awara', 'आवारा'])) animal = 'dog'

  const sites = SITE_WORDS.filter(([, words]) => has(t, words)).map(([id]) => id)
  const site: Site | null = has(t, MANY_PLACES) || sites.length > 1 ? 'multiple' : (sites[0] ?? null)

  const bleeding = has(t, BLEED_NO) ? false : has(t, BLEED_YES) ? true : null
  const brokeSkin = has(t, SKIN_NO) ? false : has(t, SKIN_YES) ? true : null

  // Only exact mappings; anything else is left for the patient to tap.
  const contact: string[] = []
  if (has(t, BITE)) contact.push('bite')
  if (has(t, SCRATCH)) contact.push('scratch')
  if (has(t, NIBBLE)) contact.push('nibble')
  const licked = has(t, LICK)
  if ((licked || has(t, SALIVA)) && has(t, MUCOSA)) contact.push('saliva-mucosa')
  if (licked && has(t, BROKEN_WORDS)) contact.push('lick-broken')
  if (licked && has(t, INTACT_WORDS)) contact.push('lick-intact')

  const atClinic = has(t, PLACE) && has(t, ARRIVED)

  return {
    animal,
    candidates,
    confident: animal !== null,
    site,
    contact,
    brokeSkin,
    bleeding,
    notMammal: has(t, NOT_MAMMAL),
    atClinic,
  }
}
