import { useCallback, useMemo } from 'react'
import type { SourceId } from '../data/sources'
import { useLocalStorage } from './useLocalStorage'

/**
 * Vaccination record tracker. Schedules are the two NCDC 2019 post-exposure regimens.
 * The tracker never tells anyone which schedule to use - the doctor does. It only counts days.
 */
export type Schedule = 'IM' | 'ID'

export interface ScheduleInfo {
  id: Schedule
  title: string
  days: number[]
  note: string
  sources: SourceId[]
}

export const SCHEDULES: ScheduleInfo[] = [
  {
    id: 'IM',
    title: 'Intramuscular - 5 doses',
    days: [0, 3, 7, 14, 28],
    note: 'One injection in the upper arm on each visit (NCDC "Essen" schedule).',
    sources: ['NCDC_2019'],
  },
  {
    id: 'ID',
    title: 'Intradermal - 4 visits',
    days: [0, 3, 7, 28],
    note: 'Two small injections per visit (NCDC updated Thai Red Cross schedule).',
    sources: ['NCDC_2019'],
  },
]

export interface VaccineRecord {
  schedule: Schedule
  /** Local date of dose 0, "YYYY-MM-DD". */
  start: string
  /** Day number -> local date the dose was taken. */
  done: Record<string, string>
  rig: boolean
  /** Hospital or clinic where the doses are given. Optional, for the doctor's report. */
  place?: string
}

export type DoseStatus = 'done' | 'today' | 'overdue' | 'upcoming'

export interface Dose {
  day: number
  due: Date
  dueLabel: string
  doneOn?: string
  status: DoseStatus
}

const KEY = 'fs.vaccine'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function dueLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function computeDoses(record: VaccineRecord, today = new Date()): Dose[] {
  const info = SCHEDULES.find((s) => s.id === record.schedule) ?? SCHEDULES[0]
  const start = parseLocal(record.start)
  const t = toLocalDate(today)
  return info.days.map((day) => {
    const due = addDays(start, day)
    const dueStr = toLocalDate(due)
    const doneOn = record.done[String(day)]
    const status: DoseStatus = doneOn ? 'done' : dueStr === t ? 'today' : dueStr < t ? 'overdue' : 'upcoming'
    return { day, due, dueLabel: dueLabel(due), doneOn, status }
  })
}

export function useVaccine() {
  const [record, setRecord] = useLocalStorage<VaccineRecord | null>(KEY, null)

  const doses = useMemo(() => (record ? computeDoses(record) : []), [record])
  const next = doses.find((d) => d.status !== 'done')
  const dosesLogged = doses.filter((d) => d.status === 'done').length

  const start = useCallback(
    (schedule: Schedule, startDate: string) => setRecord({ schedule, start: startDate, done: {}, rig: false }),
    [setRecord],
  )
  const setDone = useCallback(
    (day: number, done: boolean) =>
      setRecord((prev) => {
        if (!prev) return prev
        const next = { ...prev, done: { ...prev.done } }
        if (done) next.done[String(day)] = toLocalDate(new Date())
        else delete next.done[String(day)]
        return next
      }),
    [setRecord],
  )
  const setRig = useCallback((rig: boolean) => setRecord((prev) => (prev ? { ...prev, rig } : prev)), [setRecord])
  const setPlace = useCallback((place: string) => setRecord((prev) => (prev ? { ...prev, place } : prev)), [setRecord])
  const clear = useCallback(() => setRecord(null), [setRecord])

  return { record, doses, next, dosesLogged, start, setDone, setRig, setPlace, clear }
}

/* ---- reminders: no server, so they fire when the app is opened, plus a calendar export ---- */

export interface ReminderSettings {
  enabled: boolean
  lastNotified: string
}

export const REMINDER_KEY = 'fs.reminders'

/** Show one notification per day if a dose is due today or overdue. Call on app start. */
export function notifyIfDue(record: VaccineRecord | null, settings: ReminderSettings, save: (s: ReminderSettings) => void): void {
  if (!record || !settings.enabled) return
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const today = toLocalDate(new Date())
  if (settings.lastNotified === today) return
  const due = computeDoses(record).find((d) => d.status === 'today' || d.status === 'overdue')
  if (!due) return
  try {
    new Notification('First Safety - vaccine dose', {
      body:
        due.status === 'today'
          ? `Day ${due.day} dose is due today. Go to the hospital or clinic.`
          : `Day ${due.day} dose was due on ${due.dueLabel}. Go today - do not skip it.`,
    })
    save({ ...settings, lastNotified: today })
  } catch {
    // notifications unavailable in this context
  }
}

function icsDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

/** All-day calendar events for each dose, for the phone's calendar app. */
export function buildIcs(record: VaccineRecord): string {
  const doses = computeDoses(record)
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//First Safety//Rabies vaccine schedule//EN',
    'CALSCALE:GREGORIAN',
  ]
  for (const d of doses) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:first-safety-dose-${d.day}-${record.start}@first-safety`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(d.due)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(d.due, 1))}`,
      `SUMMARY:Rabies vaccine - day ${d.day} dose`,
      'DESCRIPTION:Anti-rabies vaccine dose. Go to the hospital or Anti-Rabies Clinic. Do not skip or delay it.',
      'BEGIN:VALARM',
      'TRIGGER:-PT9H',
      'ACTION:DISPLAY',
      `DESCRIPTION:Rabies vaccine day ${d.day} dose today`,
      'END:VALARM',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
