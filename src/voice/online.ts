import { readLS } from '../hooks/useLocalStorage'
import { validateMatch, type OnlineMatch } from './onlineSchema'

/**
 * Optional online matcher - the bonus layer that may not be there (§3, §8).
 *
 * Used only when ALL of these hold: the person turned it on in Settings (it is off by default,
 * because it sends their words off the phone); the phone is online; the offline matcher was not
 * confident. It gets 2.5 seconds in total. Any error, timeout, non-200 or invalid answer returns
 * null and the app silently uses its own tap list. It never generates a word the user reads.
 *
 * To delete the whole layer: remove api/match.ts, this file, onlineSchema.ts, the "Online help"
 * block in Settings, and the one call in VoiceInput.
 */
export const ONLINE_MATCH_KEY = 'fs.onlineMatch'
export const ONLINE_TIMEOUT_MS = 2500

export function onlineMatchEnabled(): boolean {
  return readLS<boolean>(ONLINE_MATCH_KEY, false) === true
}

export async function askOnlineMatcher(text: string, timeoutMs = ONLINE_TIMEOUT_MS): Promise<OnlineMatch | null> {
  if (!onlineMatchEnabled()) return null
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null
  const ctrl = new AbortController()
  const work = (async () => {
    try {
      const r = await fetch('/api/match', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 300) }),
        signal: ctrl.signal,
        cache: 'no-store',
      })
      if (r.status !== 200) return null
      return validateMatch(await r.json())
    } catch {
      return null
    }
  })()
  let timer = 0
  const timeout = new Promise<null>((resolve) => {
    timer = window.setTimeout(() => {
      ctrl.abort()
      resolve(null)
    }, timeoutMs)
  })
  const result = await Promise.race([work, timeout])
  window.clearTimeout(timer)
  return result
}
