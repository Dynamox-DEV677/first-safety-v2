import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

export type Theme = 'light' | 'dark' | 'system'

const KEY = 'fs.theme'
export const DEFAULT_THEME: Theme = 'light'

/** Applies the theme to <html>. With "system", the prefers-color-scheme media query decides. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
  const dark =
    theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111111' : '#ffffff')
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useLocalStorage<Theme>(KEY, DEFAULT_THEME)
  useEffect(() => {
    applyTheme(theme)
  }, [theme])
  return [theme, setTheme]
}
