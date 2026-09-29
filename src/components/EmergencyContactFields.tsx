import { MAX_CONTACTS, isCallable, useEmergencyContacts } from '../hooks/useEmergencyContact'

/**
 * The three emergency contact slots. Shared by Settings and the medical profile because they edit
 * the same stored list - see the note in useEmergencyContact.
 */
export default function EmergencyContactFields() {
  const { contacts, setContact, clearContact } = useEmergencyContacts()

  return (
    <>
      {contacts.slice(0, MAX_CONTACTS).map((c, i) => (
        <div className="contact" key={i}>
          <p className="lbl">
            Contact {i + 1}
            {i === 0 ? '' : ' (optional)'}
          </p>
          <input
            className="inp"
            aria-label={`Contact ${i + 1} name`}
            placeholder="Name, e.g. Mom"
            value={c.name}
            maxLength={40}
            onChange={(e) => setContact(i, 'name', e.target.value)}
            autoComplete="off"
          />
          <div className="btn-row" style={{ marginTop: 8 }}>
            <input
              className="inp"
              aria-label={`Contact ${i + 1} relation`}
              placeholder="Relation"
              value={c.relation}
              maxLength={30}
              onChange={(e) => setContact(i, 'relation', e.target.value)}
              autoComplete="off"
            />
            <input
              className="inp"
              aria-label={`Contact ${i + 1} phone`}
              type="tel"
              inputMode="tel"
              placeholder="Phone"
              value={c.phone}
              maxLength={20}
              onChange={(e) => setContact(i, 'phone', e.target.value)}
              autoComplete="off"
            />
          </div>
          {(c.name.trim() || c.phone.trim()) && (
            <button type="button" className="btn btn-ghost" onClick={() => clearContact(i)}>
              Remove contact {i + 1}
            </button>
          )}
          {c.name.trim() && !c.phone.trim() && <p className="small">Add a number so this one can be called.</p>}
          {!c.name.trim() && c.phone.trim() && <p className="small">Add a name so you know who this is.</p>}
        </div>
      ))}
      <p className="small">
        {contacts.filter(isCallable).length === 0
          ? 'Saved on this phone only. Nothing is uploaded.'
          : `${contacts.filter(isCallable).length} ready to call from the emergency screen. Saved on this phone only.`}
      </p>
    </>
  )
}
