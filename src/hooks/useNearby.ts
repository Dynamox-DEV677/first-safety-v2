import { useCallback, useRef, useState } from 'react'
import {
  GEO_KEY,
  NEARBY_KEY,
  NEARBY_MAX_AGE_MS,
  POSITION_MAX_AGE_MS,
  fetchNearby,
  getPosition,
  type CachedNearby,
  type CachedPosition,
  type Coords,
  type NearbyHospital,
} from '../data/geo'
import { readLS, writeLS } from './useLocalStorage'

export type NearbyStatus = 'idle' | 'locating' | 'searching' | 'ready' | 'failed'
export type NearbyFailure = 'denied' | 'timeout' | 'unsupported' | 'network' | 'none'

function freshPosition(): Coords | null {
  const c = readLS<CachedPosition | null>(GEO_KEY, null)
  if (!c || typeof c.lat !== 'number' || typeof c.lng !== 'number') return null
  return Date.now() - c.at < POSITION_MAX_AGE_MS ? { lat: c.lat, lng: c.lng } : null
}

function cachedResults(): CachedNearby | null {
  const c = readLS<CachedNearby | null>(NEARBY_KEY, null)
  if (!c || !Array.isArray(c.items) || c.items.length === 0) return null
  return Date.now() - c.at < NEARBY_MAX_AGE_MS ? c : null
}

/**
 * "Find nearest hospital", on demand only.
 *
 * Never runs on its own: no permission prompt happens until the user taps. The hard-coded state
 * list stays rendered underneath at all times, so every failure path here is a small note rather
 * than an error screen. Results from the last successful lookup are kept so a repeat visit -
 * including an offline one - still shows something.
 */
export function useNearby() {
  const [status, setStatus] = useState<NearbyStatus>('idle')
  const [failure, setFailure] = useState<NearbyFailure>('none')
  const [items, setItems] = useState<NearbyHospital[]>(() => cachedResults()?.items ?? [])
  const [resultsAt, setResultsAt] = useState<number | null>(() => cachedResults()?.at ?? null)
  const [stale, setStale] = useState<boolean>(() => cachedResults() !== null)
  const running = useRef(false)

  const run = useCallback(async (forceLocation: boolean) => {
    if (running.current) return
    running.current = true
    setFailure('none')

    let from: Coords | null = forceLocation ? null : freshPosition()

    if (!from) {
      setStatus('locating')
      try {
        from = await getPosition()
        writeLS<CachedPosition>(GEO_KEY, { ...from, at: Date.now() })
      } catch (e) {
        const reason = e instanceof Error ? e.message : 'timeout'
        setFailure(reason === 'unsupported' ? 'unsupported' : reason === 'denied' ? 'denied' : 'timeout')
        setStatus('failed')
        running.current = false
        return
      }
    }

    setStatus('searching')
    const found = await fetchNearby(from)

    if (found.length === 0) {
      setFailure('network')
      setStatus('failed')
      running.current = false
      return
    }

    const at = Date.now()
    writeLS<CachedNearby>(NEARBY_KEY, { at, from, items: found })
    setItems(found)
    setResultsAt(at)
    setStale(false)
    setStatus('ready')
    running.current = false
  }, [])

  const find = useCallback(() => void run(false), [run])
  const refresh = useCallback(() => void run(true), [run])

  return { status, failure, items, resultsAt, stale, find, refresh }
}
