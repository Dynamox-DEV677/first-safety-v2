import { useEffect, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { VOICE_DOWNLOAD_MB, isVoiceReady, voiceSupported } from '../voice'
import VoiceSettings from './VoiceSettings'

const DISMISS_KEY = 'fs.voiceOfferDismissed'

/**
 * The calm place to offer the voice download (§9): the LEARN side, never the emergency path.
 * An explicit tap starts it; "Not now" hides the offer on this phone (Settings still has it).
 */
export default function VoiceOffer() {
  const [dismissed, setDismissed] = useLocalStorage<boolean>(DISMISS_KEY, false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    let alive = true
    if (dismissed || !voiceSupported()) return
    isVoiceReady().then((ready) => alive && setShow(!ready))
    return () => {
      alive = false
    }
  }, [dismissed])

  if (dismissed || !show) return null
  return (
    <section className="offer" aria-label="Voice input">
      <h2 className="h3">Download voice input?</h2>
      <p className="body">
        About {VOICE_DOWNLOAD_MB} MB, one time, then it works offline forever. Speech is turned into text on this phone;
        audio never leaves it. Nothing downloads until you tap.
      </p>
      <VoiceSettings />
      <button type="button" className="btn btn-ghost" onClick={() => setDismissed(true)}>
        Not now
      </button>
    </section>
  )
}
