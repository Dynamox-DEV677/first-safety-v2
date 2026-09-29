import { useEffect, useRef } from 'react'
import { telHref, type EmergencyContact } from '../hooks/useEmergencyContact'

interface Props {
  /** null keeps the dialog closed. */
  contact: EmergencyContact | null
  onCancel: () => void
}

/**
 * One confirmation between a tap and a phone call.
 *
 * A panicking student with a phone in their hand mis-taps. Dialling straight from the list would
 * mean pocket-calls and wrong calls at the worst moment, so there is exactly one extra tap - no
 * typing, no second screen. Nothing here touches the network.
 *
 * Focus lands on the dialog itself rather than "Call now", so a stray Enter cannot place the call.
 */
export default function ConfirmCall({ contact, onCancel }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<Element | null>(null)

  useEffect(() => {
    if (!contact) return

    restoreTo.current = document.activeElement
    dialogRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    document.addEventListener('keydown', onKey)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      if (restoreTo.current instanceof HTMLElement) restoreTo.current.focus()
    }
  }, [contact, onCancel])

  if (!contact) return null

  const call = () => {
    // Hand off to the dialler. Works offline: it is an intent, not a request.
    window.location.href = telHref(contact.phone)
  }

  return (
    <div className="modal-back" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-call-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title" id="confirm-call-title">
          Call {contact.name.trim()} now?
        </h2>

        <p className="modal-name">
          {contact.name.trim()}
          {contact.relation.trim() ? <span className="modal-rel"> · {contact.relation.trim()}</span> : null}
        </p>
        <p className="modal-phone">{contact.phone.trim()}</p>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-solid" onClick={call}>
            Call now
          </button>
        </div>
      </div>
    </div>
  )
}
