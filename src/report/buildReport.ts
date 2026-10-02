/**
 * The hospital handover report (§7): FIRST SAFETY — INCIDENT RECORD.
 *
 * FACTS ONLY. No category, no score, no risk, no recommendation, no reassurance - and no model ever
 * writes a word of it. Generated entirely on the phone. Every field the app does not know prints
 * "Unknown" (never guessed, never omitted), because a visible "Unknown" tells the clinician to ask.
 * If the patient said yes to something - turmeric on the wound, stitches - it is reported plainly
 * with no judgement. Hiding it would be the one genuinely dangerous thing this app could do.
 *
 * Rows follow the clinic's own intake form (NCDC 2015, Annexure 2) and the layout in the v2 brief.
 */
import {
  ANIMAL_LABEL,
  SUBSTANCES,
  contactClinical,
  siteLabel,
  substanceLabel,
  yesNoUnsureLabel,
  type Answer,
  type BiteRecord,
} from '../data/bite'
import { WASH_SECONDS } from '../data/nowMode'
import { filledContacts, type MedicalProfile } from '../hooks/useMedical'
import type { VaccineRecord } from '../hooks/useVaccine'

export type Lang = 'en' | 'hi'

/**
 * Field labels. Hindi is a translation of the LABELS only; values stay exactly as recorded (§7).
 * DRAFT: the Hindi has not yet been checked by a native speaker - see docs/VERIFY.md.
 */
export const L = {
  TITLE: { en: 'FIRST SAFETY — INCIDENT RECORD', hi: 'फ़र्स्ट सेफ़्टी — घटना का रिकॉर्ड' },
  GENERATED: { en: 'Generated', hi: 'बनाया गया' },
  TIME_OF_BITE: { en: 'TIME OF BITE', hi: 'काटने का समय' },
  WASH_STARTED: { en: 'WASHING STARTED', hi: 'धुलाई शुरू हुई' },
  WASH_DURATION: { en: 'WASHING DURATION', hi: 'धुलाई की अवधि' },
  ANIMAL: { en: 'ANIMAL', hi: 'जानवर' },
  KNOWN_STRAY: { en: 'KNOWN / STRAY', hi: 'पहचाना हुआ / आवारा' },
  ANIMAL_VACCINATED: { en: 'ANIMAL VACCINATED', hi: 'जानवर को टीका लगा है' },
  OBSERVABLE: { en: 'OBSERVABLE 10 DAYS', hi: '10 दिन तक निगरानी संभव' },
  SITE: { en: 'SITE', hi: 'घाव की जगह' },
  CONTACT: { en: 'CONTACT', hi: 'संपर्क का प्रकार' },
  BLEEDING: { en: 'BLEEDING', hi: 'खून बहना' },
  SKIN_BROKEN: { en: 'SKIN BROKEN', hi: 'त्वचा कटी या फटी' },
  DONE: { en: 'DONE BEFORE ARRIVAL', hi: 'अस्पताल पहुँचने से पहले किया गया' },
  NOT_DONE: { en: 'NOT DONE / APPLIED', hi: 'नहीं किया गया / लगाया गया' },
  PRIOR_RABIES: { en: 'PRIOR RABIES VACCINE', hi: 'पहले रेबीज़ का टीका' },
  PRIOR_TETANUS: { en: 'PRIOR TETANUS', hi: 'पहले टिटनेस का टीका' },
  COURSE: { en: 'RABIES DOSES THIS COURSE', hi: 'इस कोर्स में रेबीज़ के टीके' },
  PATIENT: { en: 'PATIENT (SAVED PROFILE)', hi: 'मरीज़ (सेव की गई जानकारी)' },
  NAME: { en: 'NAME', hi: 'नाम' },
  AGE: { en: 'AGE', hi: 'उम्र' },
  WEIGHT: { en: 'WEIGHT', hi: 'वज़न' },
  BLOOD_GROUP: { en: 'BLOOD GROUP', hi: 'ब्लड ग्रुप' },
  ALLERGIES: { en: 'ALLERGIES', hi: 'एलर्जी' },
  MEDICINES: { en: 'MEDICINES', hi: 'दवाइयाँ' },
  CONDITIONS: { en: 'CONDITIONS', hi: 'बीमारियाँ' },
  FOOT_1: {
    en: 'Recorded by the patient or a bystander in the First Safety app.',
    hi: 'यह रिकॉर्ड मरीज़ या पास मौजूद किसी व्यक्ति ने First Safety ऐप में दर्ज किया है।',
  },
  FOOT_2: {
    en: 'This is a record of what happened. It contains no medical assessment.',
    hi: 'यह केवल घटना का रिकॉर्ड है। इसमें कोई चिकित्सीय आकलन नहीं है।',
  },
} as const

export type LabelKey = keyof typeof L
export const UNKNOWN = 'Unknown'

export interface RecRow {
  key: LabelKey
  value: string
  unknown: boolean
}

export interface RecSection {
  id: string
  /** Rows of LABEL  value. */
  rows?: RecRow[]
  /** Or a headed list of facts. */
  list?: { key: LabelKey; items: string[] }
}

export interface IncidentRecord {
  generatedAt: Date
  sections: RecSection[]
}

export interface RecordInput {
  bite: BiteRecord | null
  med: MedicalProfile
  vaccine: VaccineRecord | null
  /** Wash timer right now: seconds elapsed (null when no timer exists) and whether it is still running. */
  liveWashSeconds: number | null
  timerRunning: boolean
  now: Date
}

const LOCALE = 'en-IN'

export function hm(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function day(d: Date): string {
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** "13:58" today, "13:58, 30 Sep" on another day. */
function clock(iso: string, now: Date): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return sameDay(d, now) ? hm(iso) : `${hm(iso)}, ${d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })}`
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

/** "34 minutes ago", "1 hour 4 minutes ago", "2 days 3 hours ago". */
export function ago(iso: string, now: Date): string {
  const ms = now.getTime() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  if (ms < 60_000) return 'just now'
  const mins = Math.floor(ms / 60_000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (d > 0) return `${plural(d, 'day')} ${plural(h, 'hour')} ago`
  if (h > 0) return `${plural(h, 'hour')} ${plural(m, 'minute')} ago`
  return `${plural(m, 'minute')} ago`
}

/** "15 min 00 s". */
export function duration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`
}

const known = (key: LabelKey, value: string): RecRow => ({ key, value, unknown: false })
const row = (key: LabelKey, value: string | null | undefined): RecRow =>
  value && value.trim() ? known(key, value.trim()) : { key, value: UNKNOWN, unknown: true }
const answer = (key: LabelKey, a: Answer | undefined): RecRow => row(key, a && a !== 'unsure' ? yesNoUnsureLabel(a) : '')

export function buildIncidentRecord(i: RecordInput): IncidentRecord {
  const { bite, med, vaccine, now } = i
  const sections: RecSection[] = []

  // ---- time ----
  let biteRow: RecRow = row('TIME_OF_BITE', '')
  const biteKnown = !!bite?.biteAt && !Number.isNaN(Date.parse(bite.biteAt))
  if (bite) {
    const est = bite.biteEstimate
    if (est === 'over60') {
      biteRow = { key: 'TIME_OF_BITE', value: `${UNKNOWN} — more than 1 hour before ${clock(bite.openedAt, now)}`, unknown: true }
    } else if (est === '' && bite.startedVia === 'tell' && bite.openedAt) {
      // Opened the app after the fact and skipped the question: say when it was opened, guess nothing.
      biteRow = { key: 'TIME_OF_BITE', value: `${UNKNOWN} — First Safety was opened at ${clock(bite.openedAt, now)}`, unknown: true }
    } else if (est === 'unsure' || (est === '' && bite.startedVia !== 'wash') || !biteKnown) {
      biteRow = row('TIME_OF_BITE', '')
    } else {
      const base = `${clock(bite.biteAt, now)}  (${ago(bite.biteAt, now)})`
      const note =
        est === 'now' ? '' : est === '' ? ' — when First Safety was opened' : ' — estimated by the patient'
      biteRow = known('TIME_OF_BITE', `${est && est !== 'now' ? '≈ ' : ''}${base}${note}`)
    }
  }
  const biteTimeUsable = biteKnown && bite!.biteEstimate !== 'over60' && bite!.biteEstimate !== 'unsure' &&
    !(bite!.biteEstimate === '' && bite!.startedVia !== 'wash')

  const washSec = Math.max(i.liveWashSeconds ?? 0, bite?.washSeconds ?? 0)
  let washStarted = row('WASH_STARTED', '')
  if (bite?.washStartedAt) {
    let after = ''
    if (biteTimeUsable) {
      const mins = Math.round((Date.parse(bite.washStartedAt) - Date.parse(bite.biteAt)) / 60_000)
      after = mins <= 0 ? '  (under 1 min after bite)' : `  (${mins} min after bite)`
    }
    washStarted = known('WASH_STARTED', `${clock(bite.washStartedAt, now)}${after}`)
  } else {
    washStarted = { key: 'WASH_STARTED', value: `${UNKNOWN} — wash timer not used`, unknown: true }
  }
  let washDur = row('WASH_DURATION', '')
  if (i.timerRunning && washSec > 0) washDur = known('WASH_DURATION', `${duration(washSec)} so far — still washing`)
  else if (washSec >= WASH_SECONDS) washDur = known('WASH_DURATION', `${duration(WASH_SECONDS)} — completed`)
  else if (washSec > 0) washDur = known('WASH_DURATION', `${duration(washSec)} — stopped before 15 min`)
  sections.push({ id: 'time', rows: [biteRow, washStarted, washDur] })

  // ---- animal ----
  const animal = bite?.animal ?? 'unknown'
  const animalRows: RecRow[] = [row('ANIMAL', ANIMAL_LABEL[animal])]
  const k = bite?.animalKnown
  animalRows.push(
    row('KNOWN_STRAY', k === 'yes' ? 'Known — can be traced' : k === 'no' ? 'Stray or wild — not traceable' : ''),
  )
  if (k !== 'no') animalRows.push(answer('ANIMAL_VACCINATED', bite?.animalVaccinated))
  let observable = row('OBSERVABLE', '')
  if (animal === 'dog' || animal === 'cat') {
    observable = row('OBSERVABLE', k === 'yes' ? 'Yes' : k === 'no' ? 'No' : '')
  } else if (animal !== 'unknown') {
    observable = known('OBSERVABLE', 'No — the 10-day observation applies to dogs and cats only')
  }
  animalRows.push(observable)
  sections.push({ id: 'animal', rows: animalRows })

  // ---- wound ----
  const contact = (bite?.contact ?? []).map(contactClinical).filter(Boolean)
  sections.push({
    id: 'wound',
    rows: [
      row('SITE', siteLabel(bite?.site ?? '')),
      row('CONTACT', contact.join('; ')),
      answer('BLEEDING', bite?.bleeding),
      answer('SKIN_BROKEN', bite?.brokeSkin),
    ],
  })

  // ---- done before arrival / not done or applied ----
  const toldAt = bite?.substancesAt ? ` (reported at ${clock(bite.substancesAt, now)})` : ''
  const subs = bite?.substances ?? []
  const done: string[] = []
  if (i.timerRunning && washSec > 0) done.push(`Wound washing timed in the app — ${duration(washSec)} so far`)
  else if (washSec >= WASH_SECONDS) done.push(`Wound washed for ${duration(WASH_SECONDS)} (timed in the app)`)
  else if (washSec > 0) done.push(`Wound washed for ${duration(washSec)} (timed in the app, stopped early)`)
  if (subs.includes('antiseptic')) done.push(`Antiseptic applied${toldAt}`)
  if (bite?.closure === 'open') done.push('Wound left open, not bandaged')
  if (bite?.closure === 'bandaged') done.push('Wound bandaged or covered')
  if (bite?.closure === 'stitched') done.push('Wound stitched or taped before arrival')
  sections.push({ id: 'done', list: { key: 'DONE', items: done.length ? done : [UNKNOWN] } })

  const notDone: string[] = []
  if (subs.includes('none')) notDone.push('No turmeric, chilli, oil or other substance applied')
  for (const s of SUBSTANCES) {
    if (s.irritant && subs.includes(s.id)) {
      notDone.push(
        s.id === 'other' ? `Another substance applied to the wound${toldAt}` : `${substanceLabel(s.id)} applied to the wound${toldAt}`,
      )
    }
  }
  if (!subs.length) notDone.push(`Substances on the wound: ${UNKNOWN}`)
  if (bite?.closure === 'open' || bite?.closure === 'bandaged') notDone.push('No stitches, no wound closure')
  else if (!bite?.closure) notDone.push(`Stitches or wound closure: ${UNKNOWN}`)
  sections.push({ id: 'notdone', list: { key: 'NOT_DONE', items: notDone } })

  // ---- history ----
  // The saved profile belongs to the phone's owner. It is used only when the person bitten is the
  // owner (or nobody said otherwise), and is labelled as coming from the profile.
  const useProfile = bite?.patient !== 'other'
  let rabies = answer('PRIOR_RABIES', bite?.priorRabies)
  if (rabies.unknown && useProfile && med.everVaccinated && med.everVaccinated !== 'unsure') {
    const note = med.previousRabiesDoses.trim() ? ` — ${med.previousRabiesDoses.trim()}` : ''
    rabies = known('PRIOR_RABIES', `${yesNoUnsureLabel(med.everVaccinated)}${note} (saved profile)`)
  }
  let tetanus = answer('PRIOR_TETANUS', bite?.priorTetanus)
  if (useProfile && med.tetanusLastDate) {
    const d = new Date(`${med.tetanusLastDate}T00:00:00`)
    const when = Number.isNaN(d.getTime()) ? med.tetanusLastDate : day(d)
    tetanus = known('PRIOR_TETANUS', `${tetanus.unknown ? '' : `${tetanus.value} — `}last dose ${when} (saved profile)`)
  }
  const history: RecRow[] = [rabies, tetanus]
  const doses = vaccine
    ? Object.entries(vaccine.done)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([d, date]) => `Day ${d}: ${date}`)
    : []
  if (doses.length) history.push(known('COURSE', `${doses.join('; ')}${vaccine?.rig ? '; RIG given' : ''}`))
  sections.push({ id: 'history', rows: history })

  // ---- patient (saved profile), only when it applies and has something in it ----
  const profileHas =
    !!(med.name.trim() || med.ageYears !== null || med.weightKg !== null || med.bloodGroup.trim() ||
      med.allergies.trim() || med.medicines.trim() || med.conditions.trim())
  if (useProfile && profileHas) {
    sections.push({
      id: 'patient',
      list: { key: 'PATIENT', items: [] },
      rows: [
        row('NAME', med.name),
        row('AGE', med.ageYears !== null ? `${med.ageYears} years` : ''),
        row('WEIGHT', med.weightKg !== null ? `${med.weightKg} kg` : ''),
        row('BLOOD_GROUP', med.bloodGroup),
        row('ALLERGIES', med.allergies),
        row('MEDICINES', med.medicines),
        row('CONDITIONS', med.conditions),
      ],
    })
  }

  return { generatedAt: now, sections }
}

/** Contacts are never printed into the shareable record (no raw numbers on shareable screens). */
export function hasContacts(med: MedicalProfile): boolean {
  return filledContacts(med).length > 0
}

export function label(key: LabelKey, lang: Lang): string {
  return L[key][lang]
}

/** Bilingual in Hindi mode, so neither language is ever a dead end. */
export function labelBoth(key: LabelKey, lang: Lang): string {
  return lang === 'hi' ? `${L[key].hi} / ${L[key].en}` : L[key].en
}

/** Plain text for copy and share. */
export function recordText(rec: IncidentRecord, lang: Lang): string {
  const lines: string[] = [labelBoth('TITLE', lang), `${labelBoth('GENERATED', lang)} ${hm(rec.generatedAt.toISOString())} · ${day(rec.generatedAt)}`, '']
  for (const s of rec.sections) {
    if (s.list && s.list.items.length) {
      lines.push(labelBoth(s.list.key, lang))
      for (const it of s.list.items) lines.push(`  · ${it}`)
    } else if (s.list) {
      lines.push(labelBoth(s.list.key, lang))
    }
    for (const r of s.rows ?? []) lines.push(`${labelBoth(r.key, lang)}: ${r.value}`)
    lines.push('')
  }
  if (lang === 'hi') lines.push(L.FOOT_1.hi, L.FOOT_2.hi, '')
  lines.push(L.FOOT_1.en, L.FOOT_2.en)
  return lines.join('\n')
}

/** What "Read aloud" says: the same facts, label then value, in the chosen language's labels. */
export function recordSpeech(rec: IncidentRecord, lang: Lang): string {
  const sentence = (s: string) => s.replace(/\s+/g, ' ').replace(/—/g, ',').trim()
  const parts: string[] = [L.TITLE[lang].replace('—', ',')]
  for (const s of rec.sections) {
    if (s.list) {
      parts.push(`${L[s.list.key][lang]}.`)
      for (const it of s.list.items) parts.push(`${sentence(it)}.`)
    }
    for (const r of s.rows ?? []) parts.push(`${L[r.key][lang]}: ${sentence(r.value)}.`)
  }
  parts.push(L.FOOT_1[lang], L.FOOT_2[lang])
  return parts.join(' ')
}
