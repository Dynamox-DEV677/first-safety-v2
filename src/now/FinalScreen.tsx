import { useEffect } from 'react'
import { href } from '../hooks/useRoute'
import { setFlag } from '../hooks/flags'
import { markBiteComplete } from '../hooks/useBiteRecord'
import SourceNote from '../components/SourceNote'

/** The last screen. One instruction. Nothing competes with it. */
export default function FinalScreen() {
  useEffect(() => {
    setFlag('finalSeen')
    markBiteComplete()
  }, [])

  return (
    <div className="page-main final">
      <h1>Go to a hospital for the anti-rabies vaccine. Today.</h1>
      <p className="final-sub">Any government hospital or Anti-Rabies Clinic. Do not wait to see if the animal gets sick.</p>
      <div className="stack">
        <a className="btn btn-solid" href={href('/now/help')}>
          Emergency numbers and where to go
        </a>
      </div>
      <SourceNote ids={['WHO_FS', 'NCDC_2019']} />
    </div>
  )
}
