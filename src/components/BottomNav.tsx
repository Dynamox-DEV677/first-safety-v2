import { href } from '../hooks/useRoute'

interface Item {
  to: string
  label: string
  active: (route: string) => boolean
}

const ITEMS: Item[] = [
  { to: '/', label: 'Now', active: (r) => r === '/' || r.startsWith('/now') },
  { to: '/learn', label: 'Learn', active: (r) => r.startsWith('/learn') },
  { to: '/profile', label: 'Profile', active: (r) => r.startsWith('/profile') },
  { to: '/leaderboard', label: 'Scores', active: (r) => r.startsWith('/leaderboard') },
  { to: '/settings', label: 'Settings', active: (r) => r.startsWith('/settings') || r === '/sources' },
]

/** Text-only bottom navigation. Hidden on the emergency path so nothing competes with first aid. */
export default function BottomNav({ route }: { route: string }) {
  return (
    <nav className="bnav" aria-label="Main">
      <div className="bnav-in">
        {ITEMS.map((it) => (
          <a key={it.to} href={href(it.to)} className={it.active(route) ? 'on' : ''} aria-current={it.active(route) ? 'page' : undefined}>
            {it.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
