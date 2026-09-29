import {
  INDIAN_STATES,
  exposureCategories,
  helplines,
  hospitalFallback,
  hospitals,
  triage,
  vaccineInfoFor,
  type DogKnown,
} from '../data/nowMode'
import { href } from '../hooks/useRoute'
import { useLocalStorage } from '../hooks/useLocalStorage'
import SourceNote from '../components/SourceNote'
import TelLink from '../components/TelLink'
import CallContacts from '../components/CallContacts'
import NearbyHospitals from './NearbyHospitals'
import AnimalNotes, { CommonNotes } from '../components/Sourced'

/** Numbers to call, where to go, and what to tell the doctor. */
export default function HospitalFinder() {
  const [state, setState] = useLocalStorage<string>('fs.state', '')
  const [known] = useLocalStorage<DogKnown | null>('fs.triage', null)
  const listed = hospitals.filter((h) => h.state === state)

  return (
    <div className="page-main">
      <p className="eyebrow">Get help</p>
      <h1 className="title">Call, then go.</h1>

      <div className="stack">
        {helplines.map((h) => (
          <TelLink key={h.number} number={h.number} label={h.label} note={h.note} />
        ))}
      </div>

      <div className="stack" style={{ marginTop: 12 }}>
        <CallContacts />
        <a className="btn btn-solid" href={href('/report')}>
          Show this to the doctor
        </a>
      </div>

      <NearbyHospitals />

      <h2 className="h2">Hospitals listed for your state</h2>
      <p className="body">{hospitalFallback}</p>
      <label className="lbl" htmlFor="state">
        Your state
      </label>
      <select id="state" className="sel" value={state} onChange={(e) => setState(e.target.value)}>
        <option value="">Choose your state</option>
        {INDIAN_STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {state && (
        <p className="body" style={{ marginTop: 16 }}>
          <b>Is the vaccine free in {state}? </b>
          {vaccineInfoFor(state).status === 'free' && 'Yes, at government facilities. '}
          {vaccineInfoFor(state).status === 'paid' && 'Usually charged. '}
          {vaccineInfoFor(state).note}
        </p>
      )}
      {state &&
        (listed.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            {listed.map((h) => (
              <div className="hosp" key={`${h.name}-${h.phone}`}>
                <b>{h.name}</b>
                <span className="small">{h.city}</span>
                <a className="btn" style={{ marginTop: 10 }} href={`tel:${h.phone}`}>
                  Call {h.phone}
                </a>
                <span className="small">Verified: {h.verified}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="body" style={{ marginTop: 16 }}>
            No verified centre is listed for {state} yet. Ask at the nearest government hospital, or call 104 and ask
            where the anti-rabies vaccine is given.
          </p>
        ))}

      <h2 className="h2">What to tell the doctor</h2>
      {known && (
        <p className="body">
          <b>About the animal: </b>
          {triage.notes[known]}
        </p>
      )}
      <AnimalNotes />
      <p className="body">{exposureCategories.intro}</p>
      {exposureCategories.items.map((c) => (
        <div className="cat" key={c.cat}>
          <b className="roman">{c.cat}</b>
          <div>
            <p>{c.what}</p>
            <p className="act">{c.action}</p>
          </div>
        </div>
      ))}
      <CommonNotes />
      <SourceNote ids={['WHO_TRS', 'WHO_FS', 'NCDC_2019', 'GOI_112']} />

      <div className="actions">
        <a className="btn" href={href('/')}>
          Back to start
        </a>
      </div>
    </div>
  )
}
