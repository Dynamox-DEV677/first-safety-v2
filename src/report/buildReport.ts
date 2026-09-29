/**
 * Builds the doctor handoff report from what the patient recorded.
 * RECORDS ONLY. No category, no score, no recommendation. Missing fields are null and the
 * UI prints "Not recorded" with a ruled line to write on. Hard-coded labels only.
 */
import { ANIMAL_LABEL, bodyPartLabel, yesNoUnsureLabel, type BiteRecord } from '../data/bite'
import { steps } from '../data/nowMode'
import { filledContacts, type MedicalProfile } from '../hooks/useMedical'
import { SCHEDULES, type VaccineRecord } from '../hooks/useVaccine'

export interface ReportRow {
  label: string
  /** null prints as "Not recorded" plus a blank ruled line. */
  value: string | null
  big?: boolean
  /** Phone number to make the value a tel: link. */
  tel?: string
  /** Small note under the value, e.g. "Fill in by hand". */
  note?: string
}

export interface ReportSection {
  title: string
  rows: ReportRow[]
}

export interface ReportInput {
  bite: BiteRecord | null
  med: MedicalProfile
  vaccine: VaccineRecord | null
  /** Seconds on the wash timer right now (when a timer exists), else null. */
  liveWashSeconds: number | null
  timerRunning: boolean
  now: Date
}

const LOCALE = 'en-IN'

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' })
  const date = d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
  return `${time}, ${date}`
}

export function formatDate(ymdOrIso: string): string {
  if (!ymdOrIso) return ''
  const d = /^\d{4}-\d{2}-\d{2}$/.test(ymdOrIso) ? new Date(`${ymdOrIso}T00:00:00`) : new Date(ymdOrIso)
  if (Number.isNaN(d.getTime())) return ymdOrIso
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "1 h 20 m ago", "35 m ago", "2 d 3 h ago". */
export function formatSince(iso: string, now: Date): string {
  const ms = now.getTime() - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 0) return ''
  const totalMin = Math.floor(ms / 60000)
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return `${d} d ${h} h ago`
  if (h > 0) return `${h} h ${m} m ago`
  if (m > 0) return `${m} m ago`
  return 'just now'
}

/** "14 m 30 s". */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m === 0) return `${r} s`
  return r === 0 ? `${m} m` : `${m} m ${r} s`
}

const orNull = (s: string | undefined | null): string | null => (s && s.trim() ? s.trim() : null)

export function buildReport(i: ReportInput): ReportSection[] {
  const { bite, med, vaccine, now } = i

  // 1. time since bite
  const biteAt = bite?.biteAt ? formatDateTime(bite.biteAt) : ''
  const time: ReportSection = {
    title: 'Time since bite',
    rows: [
      {
        label: 'Bitten at',
        value: biteAt ? `${biteAt} (${formatSince(bite!.biteAt, now)})` : null,
        big: true,
        note: biteAt ? undefined : 'Fill in by hand',
      },
    ],
  }

  // 2. the bite
  const theBite: ReportSection = {
    title: 'The bite',
    rows: [
      { label: 'Animal', value: orNull(bite ? ANIMAL_LABEL[bite.animal] : '') },
      { label: 'Animal known to the patient', value: orNull(bite ? yesNoUnsureLabel(bite.animalKnown) : '') },
      { label: 'Body part', value: orNull(bite ? bodyPartLabel(bite.bodyPart) : '') },
      { label: 'Skin broken', value: orNull(bite ? yesNoUnsureLabel(bite.brokeSkin) : '') },
    ],
  }

  // 3. first aid given
  const washSeconds = Math.max(i.liveWashSeconds ?? 0, bite?.washSeconds ?? 0)
  const stepsDone = (bite?.stepsCompleted ?? [])
    .map((n) => steps.find((s) => s.id === n))
    .filter((s): s is (typeof steps)[number] => Boolean(s))
    .map((s) => `${s.id}. ${s.title}`)
  const firstAid: ReportSection = {
    title: 'First aid given',
    rows: [
      {
        label: 'Wound washing',
        value:
          washSeconds > 0
            ? `Soap and running water for ${formatDuration(washSeconds)}${i.timerRunning ? ' (timer still running)' : ''}`
            : null,
      },
      { label: 'Steps gone through', value: stepsDone.length ? stepsDone.join(' · ') : null },
    ],
  }

  // 4. rabies vaccine history
  const schedule = vaccine ? SCHEDULES.find((s) => s.id === vaccine.schedule) : undefined
  const dosesTaken = vaccine
    ? Object.entries(vaccine.done)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([day, date]) => `Day ${day} - ${formatDate(date)}`)
    : []
  const rabies: ReportSection = {
    title: 'Rabies vaccine history',
    rows: [
      { label: 'Vaccinated against rabies before this bite', value: orNull(yesNoUnsureLabel(med.everVaccinated)) },
      { label: 'Earlier doses (dates, places)', value: orNull(med.previousRabiesDoses) },
      {
        label: 'Current course',
        value: schedule ? `${schedule.title}${vaccine?.place?.trim() ? `, at ${vaccine.place.trim()}` : ''}` : null,
      },
      { label: 'Doses taken so far', value: dosesTaken.length ? dosesTaken.join('; ') : null },
      { label: 'Rabies immunoglobulin (RIG)', value: vaccine?.rig ? 'Given' : null },
    ],
  }

  // 5-8
  const tetanus: ReportSection = {
    title: 'Tetanus',
    rows: [{ label: 'Last tetanus dose', value: orNull(formatDate(med.tetanusLastDate)) }],
  }
  const allergies: ReportSection = {
    title: 'Allergies',
    rows: [{ label: 'Allergies', value: orNull(med.allergies) }],
  }
  const conditions: ReportSection = {
    title: 'Conditions and medicines',
    rows: [
      { label: 'Medical conditions', value: orNull(med.conditions) },
      { label: 'Current medicines', value: orNull(med.medicines) },
    ],
  }
  const patient: ReportSection = {
    title: 'Patient',
    rows: [
      { label: 'Name', value: orNull(med.name) },
      { label: 'Age', value: med.ageYears !== null ? `${med.ageYears} years` : null },
      { label: 'Weight', value: med.weightKg !== null ? `${med.weightKg} kg` : null },
      { label: 'Blood group', value: orNull(med.bloodGroup) },
    ],
  }

  // 9. emergency contacts
  const contacts = filledContacts(med)
  const emergency: ReportSection = {
    title: 'Emergency contacts',
    rows: contacts.length
      ? contacts.map((c) => ({
          label: `${c.name.trim() || 'Contact'}${c.relation.trim() ? ` (${c.relation.trim()})` : ''}`,
          value: orNull(c.phone),
          tel: c.phone.trim() || undefined,
        }))
      : [{ label: 'Contact', value: null }],
  }

  return [time, theBite, firstAid, rabies, tetanus, allergies, conditions, patient, emergency]
}

export const REPORT_TITLE = 'Information for the doctor'
export const REPORT_SUBTITLE = 'Reported by the patient. Not a diagnosis.'
export const REPORT_FOOTER =
  'Recorded by First Safety. First-aid steps follow WHO and NCDC India guidance. This app does not diagnose or prescribe.'

/** Plain-text version for sharing with a parent. */
export function reportText(sections: ReportSection[], now: Date): string {
  const lines: string[] = [REPORT_TITLE.toUpperCase(), REPORT_SUBTITLE, `Generated ${formatDateTime(now.toISOString())}`, '']
  for (const s of sections) {
    lines.push(s.title.toUpperCase())
    for (const r of s.rows) lines.push(`${r.label}: ${r.value ?? 'Not recorded'}`)
    lines.push('')
  }
  lines.push('Emergency numbers: 112 (all India), 108 (ambulance, coverage varies by state), 104 (health helpline, coverage varies by state)')
  lines.push('')
  lines.push(REPORT_FOOTER)
  return lines.join('\n')
}
