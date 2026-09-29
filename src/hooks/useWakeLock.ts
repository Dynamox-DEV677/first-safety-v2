import { useEffect } from 'react'

/** Keep the screen on while the wash timer runs. Silently does nothing where unsupported. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) await sentinel.release()
      } catch {
        // denied or unsupported (e.g. low battery) - the timer still runs from the wall clock
      }
    }
    void request()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void request()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release().catch(() => undefined)
    }
  }, [active])
}
