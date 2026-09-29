import { directionsUrl, formatDistance } from '../data/geo'
import { useNearby } from '../hooks/useNearby'

function agoLabel(at: number): string {
  const mins = Math.floor((Date.now() - at) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} h ago`
  return `${Math.floor(hrs / 24)} d ago`
}

/**
 * Live nearest-hospital lookup, sitting above the hard-coded state list.
 * Additive only: the list below never disappears, so every failure here is just a note.
 */
export default function NearbyHospitals() {
  const n = useNearby()
  const busy = n.status === 'locating' || n.status === 'searching'
  const hasItems = n.items.length > 0

  return (
    <section className="nearby" aria-label="Nearest hospitals">
      <h2 className="h2">Nearest hospitals</h2>
      <p className="body">
        Uses your phone&rsquo;s location and OpenStreetMap to list hospitals within 10 km. Needs internet. Your
        location is used for this search only and is never saved anywhere but this phone.
      </p>

      {!hasItems && (
        <button type="button" className="btn" onClick={n.find} disabled={busy}>
          {n.status === 'locating' ? 'Getting your location…' : n.status === 'searching' ? 'Searching…' : 'Find nearest hospital'}
        </button>
      )}

      {n.status === 'failed' && (
        <p className="body" style={{ marginTop: 12 }}>
          {n.failure === 'denied' && 'Location is off or was not allowed. '}
          {n.failure === 'timeout' && 'Could not get your location quickly enough. '}
          {n.failure === 'unsupported' && 'This browser cannot share location. '}
          {n.failure === 'network' && 'No internet, or no hospitals found on the map nearby. '}
          Use the list for your state below, or call 112.
        </p>
      )}

      {hasItems && (
        <>
          <p className="small">
            {n.stale ? 'From your last search, ' : 'Found '}
            {n.resultsAt !== null ? agoLabel(n.resultsAt) : ''}. Straight-line distance.
          </p>
          <div className="nearby-list">
            {n.items.map((h) => (
              <div className="hosp" key={h.id}>
                <b>{h.name}</b>
                <span className="small">
                  {formatDistance(h.distanceM)}
                  {h.area ? ` · ${h.area}` : ''}
                </span>
                {h.phone ? (
                  <a className="btn" style={{ marginTop: 10 }} href={`tel:${h.phone}`}>
                    Call {h.phone}
                  </a>
                ) : (
                  <a className="btn" style={{ marginTop: 10 }} href={directionsUrl(h)} target="_blank" rel="noopener noreferrer">
                    Get directions
                  </a>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" onClick={n.refresh} disabled={busy}>
            {busy ? 'Updating…' : 'Update my location'}
          </button>
        </>
      )}

      <div className="notice" style={{ marginTop: 16 }}>
        These come from a public map, so they are not checked and may not stock the anti-rabies vaccine. Government
        hospitals and Anti-Rabies Clinics are the surest place. Phone first if you can.
      </div>
    </section>
  )
}
