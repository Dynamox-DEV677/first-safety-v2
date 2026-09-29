import { useLocalStorage } from './useLocalStorage'

/**
 * Medical profile - optional details the patient wants a doctor to see.
 * Saved only on this phone. Nothing is required, nothing is interpreted.
 */
export interface EmergencyContact {
  name: string
  relation: string
  phone: string
}

export interface MedicalProfile {
  name: string
  ageYears: number | null
  weightKg: number | null
  bloodGroup: string
  /** Rabies vaccination before this bite. Dose dates for the current course live in the vaccine tracker. */
  everVaccinated: 'yes' | 'no' | 'unsure' | ''
  /** Free text: dates and places of earlier rabies vaccine doses. */
  previousRabiesDoses: string
  /** "YYYY-MM-DD" or ''. */
  tetanusLastDate: string
  allergies: string
  conditions: string
  medicines: string
  /** Always three slots; blank rows are ignored. */
  emergencyContacts: EmergencyContact[]
}

export const MEDICAL_KEY = 'fs.medical'

const blankContact = (): EmergencyContact => ({ name: '', relation: '', phone: '' })

export const EMPTY_MEDICAL: MedicalProfile = {
  name: '',
  ageYears: null,
  weightKg: null,
  bloodGroup: '',
  everVaccinated: '',
  previousRabiesDoses: '',
  tetanusLastDate: '',
  allergies: '',
  conditions: '',
  medicines: '',
  emergencyContacts: [blankContact(), blankContact(), blankContact()],
}

/** Fill in anything missing from older saved shapes. */
export function normaliseMedical(m: Partial<MedicalProfile> | null | undefined): MedicalProfile {
  const contacts = Array.isArray(m?.emergencyContacts) ? m.emergencyContacts.slice(0, 3) : []
  while (contacts.length < 3) contacts.push(blankContact())
  return { ...EMPTY_MEDICAL, ...(m ?? {}), emergencyContacts: contacts }
}

export function useMedical(): [MedicalProfile, (next: MedicalProfile) => void] {
  const [raw, set] = useLocalStorage<MedicalProfile>(MEDICAL_KEY, EMPTY_MEDICAL)
  return [normaliseMedical(raw), set]
}

export function filledContacts(m: MedicalProfile): EmergencyContact[] {
  return m.emergencyContacts.filter((c) => c.name.trim() || c.phone.trim())
}

/** How many fields have something in them - for the profile summary row. */
export function medicalFilledCount(m: MedicalProfile): number {
  let n = 0
  if (m.name.trim()) n++
  if (m.ageYears !== null) n++
  if (m.weightKg !== null) n++
  if (m.bloodGroup.trim()) n++
  if (m.everVaccinated) n++
  if (m.previousRabiesDoses.trim()) n++
  if (m.tetanusLastDate) n++
  if (m.allergies.trim()) n++
  if (m.conditions.trim()) n++
  if (m.medicines.trim()) n++
  n += filledContacts(m).length
  return n
}
