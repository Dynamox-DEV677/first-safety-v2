/**
 * Live "find nearest hospital" support. Zero backend.
 *
 * This is the ONLY feature in First Safety that sends anything off the phone, and only when the
 * user taps the button: the coordinates go to the public OpenStreetMap Overpass API to look up
 * hospitals. No key, no account, no analytics.
 *
 * It is strictly additive. The hard-coded state list stays on screen the whole time, so if
 * location or network fails there is nothing to fall back TO - the fallback never left.
 */

export interface Coords {
  lat: number
  lng: number
}

export interface CachedPosition extends Coords {
  /** epoch ms */
  at: number
}

export interface NearbyHospital {
  id: string
  name: string
  lat: number
  lng: number
  /** metres, straight line */
  distanceM: number
  phone: string | null
  /** Free-text locality from OSM address tags, when present. */
  area: string | null
}

export interface CachedNearby {
  at: number
  from: Coords
  items: NearbyHospital[]
}

export const GEO_KEY = 'fs.geo'
export const NEARBY_KEY = 'fs.nearby'

/** Reuse a saved fix rather than re-prompting for permission on a repeat visit. */
export const POSITION_MAX_AGE_MS = 30 * 60 * 1000
/** Kept only so an offline repeat visit still has something useful. */
export const NEARBY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/** Location must resolve fast: an emergency screen cannot wait for a GPS lock. */
export const GEO_TIMEOUT_MS = 2500
/** Overpass is a free shared instance and often slow or overloaded; abort rather than hang. */
export const OVERPASS_TIMEOUT_MS = 5000
/** Second try if the main instance fails, with a shorter budget. */
export const OVERPASS_RETRY_TIMEOUT_MS = 4000

export const SEARCH_RADIUS_M = 10000
export const MAX_RESULTS = 5

/**
 * The main instance returns 504 under load often enough to matter for an emergency screen, so a
 * well-known mirror is tried once before giving up. Order matters: main first.
 */
export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
] as const

/** Straight-line distance in metres. Haversine, no library. */
export function haversineM(a: Coords, b: Coords): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m away`
  return `${(metres / 1000).toFixed(metres < 10000 ? 1 : 0)} km away`
}

/** Overpass QL. nwr covers hospitals mapped as nodes, ways and relations; "out center" gives each a point. */
export function overpassQuery(c: Coords): string {
  const lat = c.lat.toFixed(5)
  const lng = c.lng.toFixed(5)
  return `[out:json][timeout:8];nwr["amenity"="hospital"](around:${SEARCH_RADIUS_M},${lat},${lng});out center 60;`
}

interface OverpassElement {
  type?: string
  id?: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function firstTag(tags: Record<string, string>, keys: string[]): string | null {
  for (const k of keys) {
    const v = tags[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

/** Keep only the first number when OSM lists several, and strip anything not diallable. */
export function cleanPhone(raw: string | null): string | null {
  if (!raw) return null
  const first = raw.split(/[;,/]/)[0].trim()
  const cleaned = first.replace(/[^\d+]/g, '')
  const digits = cleaned.replace(/\D/g, '')
  if (digits.length < 6 || digits.length > 15) return null
  return cleaned
}

/** Turn an Overpass response into sorted, de-duplicated results. Never throws. */
export function parseOverpass(json: unknown, from: Coords): NearbyHospital[] {
  const elements = (json as { elements?: OverpassElement[] } | null)?.elements
  if (!Array.isArray(elements)) return []

  const out: NearbyHospital[] = []
  const seen = new Set<string>()

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat
    const lng = el.lon ?? el.center?.lon
    if (typeof lat !== 'number' || typeof lng !== 'number') continue

    const tags = el.tags ?? {}
    const name = firstTag(tags, ['name:en', 'name', 'official_name', 'operator']) ?? 'Hospital (unnamed on the map)'
    const key = `${name.toLowerCase()}|${lat.toFixed(3)},${lng.toFixed(3)}`
    if (seen.has(key)) continue
    seen.add(key)

    out.push({
      id: `${el.type ?? 'n'}/${el.id ?? `${lat},${lng}`}`,
      name,
      lat,
      lng,
      distanceM: haversineM(from, { lat, lng }),
      phone: cleanPhone(firstTag(tags, ['phone', 'contact:phone', 'phone:emergency', 'contact:mobile'])),
      area: firstTag(tags, ['addr:suburb', 'addr:city', 'addr:district', 'addr:town', 'addr:village']),
    })
  }

  return out.sort((a, b) => a.distanceM - b.distanceM).slice(0, MAX_RESULTS)
}

/** Ask the browser for a position, with a hard time limit. Rejects on denial, timeout or no support. */
export function getPosition(timeoutMs = GEO_TIMEOUT_MS): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('unsupported'))
      return
    }
    let settled = false
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error('timeout'))
    }, timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        reject(new Error('denied'))
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: POSITION_MAX_AGE_MS },
    )
  })
}

/** POST the Overpass query to one endpoint. Never throws: returns null on any failure. */
async function queryOne(endpoint: string, from: Coords, timeoutMs: number): Promise<NearbyHospital[] | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(overpassQuery(from))}`,
      signal: controller.signal,
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    })
    if (!res.ok) return null
    return parseOverpass(await res.json(), from)
  } catch {
    // offline, aborted, DNS failure, API down, bad JSON - all handled the same way
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

/** Try the main Overpass instance, then one mirror. Returns [] when every attempt fails. */
export async function fetchNearby(from: Coords): Promise<NearbyHospital[]> {
  const budgets = [OVERPASS_TIMEOUT_MS, OVERPASS_RETRY_TIMEOUT_MS]
  for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
    const found = await queryOne(OVERPASS_ENDPOINTS[i], from, budgets[i] ?? OVERPASS_RETRY_TIMEOUT_MS)
    if (found && found.length > 0) return found
  }
  return []
}

/** Directions deep link. Opens the phone's map app on Android, Maps on the web elsewhere. */
export function directionsUrl(h: NearbyHospital): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`
}
