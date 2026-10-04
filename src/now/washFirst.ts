import type { BiteRecord } from '../data/bite'
import { navigate } from '../hooks/useRoute'
import type { TimerStatus } from '../hooks/useTimer'

/**
 * Wash first. WHO says wash as soon as possible, so on "Tell me what happened" the first answer
 * starts the 15 minutes and opens the wash screen. The other questions come while the water runs:
 * the wash screen offers them, the header keeps the clock, and every question screen says "Back to
 * washing". Someone already washing (or done) just carries on to the next question.
 */
export function afterFirstAnswer(timer: { status: TimerStatus; start: () => void }, site: BiteRecord['site'] | null | undefined): void {
  if (timer.status === 'idle') {
    timer.start()
    navigate('/now/step/1')
  } else {
    navigate(site ? '/now/details' : '/now/area')
  }
}

/** The first question not answered yet: the animal, then the site, then the facts screen. */
export function nextQuestion(bite: Pick<BiteRecord, 'animal' | 'site'> | null): string {
  if (!bite?.animal) return '/now/animal'
  if (!bite.site) return '/now/area'
  return '/now/details'
}
