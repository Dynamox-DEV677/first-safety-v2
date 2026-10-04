import { useState } from 'react'
import { href } from '../hooks/useRoute'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useTheme, type Theme } from '../hooks/useTheme'
import { REMINDER_KEY, type ReminderSettings } from '../hooks/useVaccine'
import EmergencyContactFields from './EmergencyContactFields'
import VoiceSettings from './VoiceSettings'
import { ONLINE_MATCH_KEY } from '../voice/online'
import { TIMER_BANNER_KEY, TIMER_KEY, clearWashTimer } from '../hooks/useTimer'

const THEMES: { id: Theme; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
]

export default function Settings() {
  const [theme, setTheme] = useTheme()
  const [reminders, setReminders] = useLocalStorage<ReminderSettings>(REMINDER_KEY, { enabled: false, lastNotified: '' })
  const [online, setOnline] = useLocalStorage<boolean>(ONLINE_MATCH_KEY, true)
  const [permission, setPermission] = useState<string>(() =>
    'Notification' in window ? Notification.permission : 'unsupported',
  )

  const enableReminders = async () => {
    if (!('Notification' in window)) return
    const p = await Notification.requestPermission()
    setPermission(p)
    if (p === 'granted') setReminders({ ...reminders, enabled: true })
  }

  const resetAll = () => {
    if (!window.confirm('Delete everything saved on this phone - progress, scores, bookmarks, contacts and the vaccine record?')) return
    try {
      // Snapshot the keys first: removing while enumerating storage is unreliable.
      const keys: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        if (k && k.startsWith('fs.')) keys.push(k)
      }
      keys.forEach((k) => window.localStorage.removeItem(k))
      // Belt and braces: the wash timer is the one thing that must never survive a reset.
      window.localStorage.removeItem(TIMER_KEY)
      window.localStorage.removeItem(TIMER_BANNER_KEY)
      clearWashTimer()
    } catch {
      // nothing to clear
    }
    window.location.hash = '/'
    window.location.reload()
  }

  return (
    <div className="page-main">
      <p className="eyebrow">Settings</p>
      <h1 className="title">Settings</h1>

      <h2 className="h2" style={{ marginTop: 8 }}>
        Emergency contact
      </h2>
      <p className="body">
        Up to three people to call from the emergency screen - a parent, another adult, the school
        nurse. Tapping one asks you to confirm before it dials, so a mis-tap cannot start a call.
      </p>
      <EmergencyContactFields />
      <p className="small" style={{ marginTop: 10 }}>
        These are the same contacts as in your medical profile, so the doctor&rsquo;s report shows them too.
      </p>

      <h2 className="h2">Appearance</h2>
      <div className="seg" role="group" aria-label="Theme">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn ${theme === t.id ? 'on' : ''}`}
            aria-pressed={theme === t.id}
            onClick={() => setTheme(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="small" style={{ marginTop: 10 }}>
        Emergency screens use the same red in both themes.
      </p>

      <h2 className="h2">Vaccine reminders</h2>
      <p className="body">
        There is no server behind this app, so reminders appear when you open it on a dose day. For alarms, add the
        doses to your phone calendar from the Profile tab.
      </p>
      {permission === 'unsupported' && <p className="body">This browser does not support notifications.</p>}
      {permission === 'denied' && (
        <p className="body">Notifications are blocked for this site. Allow them in your browser settings to use reminders.</p>
      )}
      {permission !== 'unsupported' && permission !== 'denied' && (
        <div className="seg">
          <button
            type="button"
            className={`btn ${reminders.enabled && permission === 'granted' ? 'on' : ''}`}
            onClick={enableReminders}
          >
            {reminders.enabled && permission === 'granted' ? 'Reminders on' : 'Turn on reminders'}
          </button>
          {reminders.enabled && (
            <button type="button" className="btn" onClick={() => setReminders({ ...reminders, enabled: false })}>
              Turn off
            </button>
          )}
        </div>
      )}

      <h2 className="h2">Voice input</h2>
      <p className="body">
        Say what happened instead of tapping it. The speech model downloads by itself, once, then runs on this phone,
        and audio never leaves it. English only for now.
      </p>
      <VoiceSettings />

      <h3 className="h3">Online help for unclear answers</h3>
      <p className="body">
        On by default. When the app cannot tell what you said or typed, it sends just those words to Google&rsquo;s
        Gemini, which may only pick from the same buttons, for 2.5 seconds at most. Never your report, never audio,
        nothing else. Offline, or if it is slow, the app simply shows the buttons. Turn it off to keep everything on
        this phone.
      </p>
      <div className="seg" role="group" aria-label="Online help">
        <button type="button" className={`btn ${online ? 'on' : ''}`} aria-pressed={online} onClick={() => setOnline(true)}>
          On
        </button>
        <button type="button" className={`btn ${!online ? 'on' : ''}`} aria-pressed={!online} onClick={() => setOnline(false)}>
          Off
        </button>
      </div>

      <h2 className="h2">Your data</h2>
      <p className="body">
        No account, no analytics. Everything - progress, scores, bookmarks, contacts, the vaccine record, the
        medical profile and every incident record - stays on this phone and is never uploaded. The only thing that can
        leave it is the few words you type or say when the app cannot place them, while Online help is on. Resetting
        deletes all of it (voice files are removed separately above).
      </p>
      <button type="button" className="btn" onClick={resetAll}>
        Reset all data
      </button>

      <h2 className="h2">About</h2>
      <p className="body">
        First Safety - the first 15 minutes matter most. First-aid steps and facts are hard-coded from WHO and India
        NCDC guidance and never generated by software.
      </p>
      <div className="stack">
        <a className="btn" href={href('/sources')}>
          Sources
        </a>
      </div>
    </div>
  )
}
