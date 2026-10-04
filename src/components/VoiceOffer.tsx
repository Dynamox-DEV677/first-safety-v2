import { useEffect, useState } from 'react'
import { VOICE_DOWNLOAD_MB, getVoiceInstall, onVoiceInstall } from '../voice'
import VoiceSettings from './VoiceSettings'

/**
 * While voice downloads by itself, the LEARN home says what is using the data, how much, and how to
 * stop it. Hidden the rest of the time; Settings always has the full controls.
 */
export default function VoiceOffer() {
  const [phase, setPhase] = useState(() => getVoiceInstall().phase)

  useEffect(() => onVoiceInstall((s) => setPhase(s.phase)), [])

  if (phase !== 'downloading') return null
  return (
    <section className="offer" aria-label="Voice input">
      <h2 className="h3">Getting voice input ready</h2>
      <p className="body">
        About {VOICE_DOWNLOAD_MB} MB, once, so you can speak instead of tapping in an emergency. Speech is turned into
        text on this phone; audio never leaves it.
      </p>
      <VoiceSettings />
    </section>
  )
}
