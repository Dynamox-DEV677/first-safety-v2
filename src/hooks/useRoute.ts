import { useEffect, useState } from 'react'

/**
 * Hash routing: works offline, on any static host, with no rewrites.
 * Routes look like "#/now/step/1".
 */
function read(): string {
  const h = window.location.hash.replace(/^#/, '')
  return h.startsWith('/') ? h : '/'
}

export function useRoute(): string {
  const [route, setRoute] = useState<string>(read)
  useEffect(() => {
    const onChange = () => {
      setRoute(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function href(path: string): string {
  return '#' + path
}

export function navigate(path: string): void {
  window.location.hash = path
}

/** Match "/now/step/:n" against a route. Returns params or null. */
export function match(route: string, pattern: string): Record<string, string> | null {
  const r = route.split('/').filter(Boolean)
  const p = pattern.split('/').filter(Boolean)
  if (r.length !== p.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(r[i])
    else if (p[i] !== r[i]) return null
  }
  return params
}
