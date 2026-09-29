import { useCallback } from 'react'
import { normaliseMedical, useMedical, type EmergencyContact, type MedicalProfile } from './useMedical'
import { readLS, writeLS } from './useLocalStorage'

/**
 * Emergency contacts: up to three people the student can call in two taps.
 *
 * localStorage only. No account, no sync, no network - the whole flow works with the phone in
 * airplane mode, like the rest of NOW mode.
 *
 * These are deliberately the SAME contacts as the medical profile's, stored once in `fs.medical`.
 * A second list would drift: a student updates one, and the other - including the number printed
 * on the doctor's report - goes stale. Editing them in Settings and in the medical profile writes
 * to the same place.
 */
export const MAX_CONTACTS = 3

/** The single-contact store used by the earlier build, migrated once then removed. */
const LEGACY_KEY = 'fs.emergencyContact'
const MEDICAL_KEY = 'fs.medical'

export type { EmergencyContact }

export function isCallable(c: EmergencyContact): boolean {
  return Boolean(c.name.trim() && c.phone.trim())
}

/** Strip to something a dialler will accept, keeping a single leading +. */
export function telHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '')
  return `tel:${cleaned.startsWith('+') ? `+${cleaned.slice(1).replace(/\+/g, '')}` : cleaned.replace(/\+/g, '')}`
}

interface LegacyContact {
  name?: string
  phone?: string
}

/**
 * Move the older single contact into the shared list. Runs once at app start, outside React, so
 * there is no chance of a render loop. Safe to call repeatedly.
 */
export function migrateLegacyContact(): void {
  const legacy = readLS<LegacyContact | null>(LEGACY_KEY, null)
  if (!legacy || typeof legacy.phone !== 'string' || !legacy.phone.trim()) {
    if (legacy !== null) writeLS(LEGACY_KEY, null)
    return
  }

  const med = normaliseMedical(readLS<Partial<MedicalProfile> | null>(MEDICAL_KEY, null))
  const already = med.emergencyContacts.some((c) => c.phone.replace(/\D/g, '') === legacy.phone!.replace(/\D/g, ''))

  if (!already) {
    const slot = med.emergencyContacts.findIndex((c) => !isCallable(c))
    if (slot !== -1) {
      const next = med.emergencyContacts.map((c, i) =>
        i === slot ? { name: (legacy.name ?? '').trim() || 'Emergency contact', relation: c.relation, phone: legacy.phone!.trim() } : c,
      )
      writeLS(MEDICAL_KEY, { ...med, emergencyContacts: next })
    }
  }

  writeLS(LEGACY_KEY, null)
}

export function useEmergencyContacts() {
  const [med, setMed] = useMedical()

  const setContact = useCallback(
    (index: number, field: keyof EmergencyContact, value: string) => {
      setMed({
        ...med,
        emergencyContacts: med.emergencyContacts.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
      })
    },
    [med, setMed],
  )

  const clearContact = useCallback(
    (index: number) => {
      setMed({
        ...med,
        emergencyContacts: med.emergencyContacts.map((c, i) => (i === index ? { name: '', relation: '', phone: '' } : c)),
      })
    },
    [med, setMed],
  )

  return {
    contacts: med.emergencyContacts,
    /** Only those with both a name and a number, in saved order. */
    callable: med.emergencyContacts.filter(isCallable),
    setContact,
    clearContact,
  }
}
