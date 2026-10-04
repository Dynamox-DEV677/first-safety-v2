import type { CSSProperties, ReactNode } from 'react'
import { YES_NO_UNSURE } from '../data/bite'
import { href } from '../hooks/useRoute'
import { EMPTY_MEDICAL, useMedical, type MedicalProfile as Profile } from '../hooks/useMedical'
import EmergencyContactFields from '../components/EmergencyContactFields'
import VaccinationTracker from './VaccinationTracker'

/**
 * Optional details for a doctor. Everything is saved on this phone as you type.
 * The form never blocks anything and never interprets what is entered.
 */
export default function MedicalProfile() {
  const [m, setM] = useMedical()

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setM({ ...m, [key]: value })
  const setNum = (key: 'ageYears' | 'weightKg', raw: string) => {
    const n = raw.trim() === '' ? null : Number(raw)
    set(key, n === null || Number.isNaN(n) ? null : n)
  }
  const clearAll = () => {
    if (window.confirm('Clear all medical information from this phone? The vaccine tracker is kept.')) setM(EMPTY_MEDICAL)
  }

  return (
    <div className="page-main">
      <p className="eyebrow">Profile · Medical</p>
      <h1 className="title">Medical profile</h1>
      <div className="notice">
        This is for showing a doctor. It is saved only on this phone. Nothing is uploaded. You can leave anything blank.
      </div>

      <h2 className="h2" style={{ marginTop: 8 }}>
        Patient
      </h2>
      <Field id="name" label="Name">
        <input id="name" className="inp" value={m.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" />
      </Field>
      <Field id="age" label="Age (years)">
        <input id="age" className="inp" type="number" inputMode="numeric" min={0} max={120} value={m.ageYears ?? ''} onChange={(e) => setNum('ageYears', e.target.value)} />
      </Field>
      <Field id="weight" label="Weight (kg)" hint="Some injections are dosed by weight.">
        <input id="weight" className="inp" type="number" inputMode="decimal" min={0} max={300} step="0.5" value={m.weightKg ?? ''} onChange={(e) => setNum('weightKg', e.target.value)} />
      </Field>
      <Field id="blood" label="Blood group">
        <input id="blood" className="inp" value={m.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} placeholder="e.g. O+" autoComplete="off" />
      </Field>

      <h2 className="h2">Rabies vaccine</h2>
      <p className="lbl">Vaccinated against rabies before this bite?</p>
      <div className="seg" role="group" aria-label="Vaccinated before">
        {YES_NO_UNSURE.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`btn ${m.everVaccinated === o.id ? 'on' : ''}`}
            aria-pressed={m.everVaccinated === o.id}
            onClick={() => set('everVaccinated', m.everVaccinated === o.id ? '' : o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <Field id="prev" label="Earlier doses – dates and places" style={{ marginTop: 16 }}>
        <textarea id="prev" className="inp" rows={3} value={m.previousRabiesDoses} onChange={(e) => set('previousRabiesDoses', e.target.value)} placeholder="e.g. 3 doses in 2024 at the district hospital" />
      </Field>
      <p className="lbl" style={{ marginTop: 20 }}>
        Current course (this bite)
      </p>
      <VaccinationTracker />

      <h2 className="h2">Tetanus</h2>
      <Field id="tet" label="Last tetanus dose">
        <input id="tet" className="inp" type="date" value={m.tetanusLastDate} onChange={(e) => set('tetanusLastDate', e.target.value)} />
      </Field>

      <h2 className="h2">Allergies, conditions, medicines</h2>
      <Field id="all" label="Allergies">
        <textarea id="all" className="inp" rows={2} value={m.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="e.g. penicillin" />
      </Field>
      <Field id="cond" label="Medical conditions">
        <textarea id="cond" className="inp" rows={2} value={m.conditions} onChange={(e) => set('conditions', e.target.value)} placeholder="e.g. asthma" />
      </Field>
      <Field id="meds" label="Current medicines">
        <textarea id="meds" className="inp" rows={2} value={m.medicines} onChange={(e) => set('medicines', e.target.value)} />
      </Field>

      <h2 className="h2">Emergency contacts</h2>
      <p className="body">
        Also used by the &ldquo;Call&rdquo; buttons on the emergency screen.
      </p>
      <EmergencyContactFields />

      <div className="stack" style={{ marginTop: 28 }}>
        <a className="btn btn-solid" href={href('/report')}>
          Show the doctor&rsquo;s report
        </a>
        <button type="button" className="btn btn-ghost" onClick={clearAll}>
          Clear all medical info
        </button>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  hint,
  style,
  children,
}: {
  id: string
  label: string
  hint?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <div className="field" style={style}>
      <label className="lbl" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && (
        <p className="small" style={{ margin: '6px 0 0' }}>
          {hint}
        </p>
      )}
    </div>
  )
}
