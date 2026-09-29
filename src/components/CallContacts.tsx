import { useState } from 'react'
import { href } from '../hooks/useRoute'
import { useEmergencyContacts, type EmergencyContact } from '../hooks/useEmergencyContact'
import ConfirmCall from './ConfirmCall'

/**
 * "Call Mom" buttons for the emergency screen, one per saved contact, each confirming before it
 * dials. With nothing saved it offers the way to add one instead - never a dead button.
 */
export default function CallContacts() {
  const { callable } = useEmergencyContacts()
  const [pending, setPending] = useState<EmergencyContact | null>(null)

  if (callable.length === 0) {
    return (
      <a className="btn" href={href('/settings')}>
        Add an emergency contact
      </a>
    )
  }

  return (
    <>
      {callable.map((c, i) => (
        <button key={`${c.name}-${c.phone}-${i}`} type="button" className="btn btn-solid" onClick={() => setPending(c)}>
          Call {c.name.trim()}
        </button>
      ))}
      <ConfirmCall contact={pending} onCancel={() => setPending(null)} />
    </>
  )
}
