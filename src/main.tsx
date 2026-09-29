import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { migrateLegacyContact } from './hooks/useEmergencyContact'
import { readLS } from './hooks/useLocalStorage'
import { applyTheme, DEFAULT_THEME, type Theme } from './hooks/useTheme'
import './styles.css'

// Apply the saved theme before the first paint so there is no flash.
applyTheme(readLS<Theme>('fs.theme', DEFAULT_THEME))

// Offline-first: the service worker caches the whole app on first load.
registerSW({ immediate: true })

// Fold the older single emergency contact into the shared list, once.
migrateLegacyContact()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
