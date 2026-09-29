import { href } from '../hooks/useRoute'
import { writeLS } from '../hooks/useLocalStorage'
import { startBiteRecord } from '../hooks/useBiteRecord'
import { clearWashTimer } from '../hooks/useTimer'

interface Props {
  /** Step to resume, when a first-aid session was already started on this phone. */
  resumeStep: number | null
}

/** The hero: one very large red button. The only red thing on the home screen. */
export default function EntryScreen({ resumeStep }: Props) {
  const begin = () => {
    // A new incident: stamp the bite time for the doctor's report and reset the step position.
    // Clearing the wash timer is what stops a finished timer from an earlier session showing
    // step 1 as already "done" - the timer must always start a new bite at a full 15:00.
    clearWashTimer()
    startBiteRecord()
    writeLS('fs.nowStep', 0)
    writeLS('fs.triage', null)
  }

  return (
    <>
      <a className="btn btn-red btn-hero" href={href('/now/triage')} onClick={begin}>
        I&rsquo;ve been bitten
        <small>Dog bite? Start here.</small>
      </a>
      {resumeStep !== null && (
        <a className="btn" href={href(`/now/step/${resumeStep}`)}>
          Continue first aid · step {resumeStep}
        </a>
      )}
    </>
  )
}
