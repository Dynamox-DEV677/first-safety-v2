import { useCallback, useEffect, useRef, useState } from 'react'

/** Fired in this tab whenever writeLS changes a key, so every hook instance stays in sync. */
const EVT = 'fs:storage'

export function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeLS<T>(key: string, value: T): void {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable (private mode, full). The app still works for this session.
  }
  window.dispatchEvent(new CustomEvent(EVT, { detail: key }))
}

type Setter<T> = (value: T | ((prev: T) => T)) => void

/**
 * useState backed by localStorage. All state in First Safety lives here: no backend, no accounts.
 * Instances sharing a key update together (same tab via a custom event, other tabs via 'storage').
 */
export function useLocalStorage<T>(key: string, initial: T): [T, Setter<T>] {
  const initialRef = useRef(initial)
  const [value, setValue] = useState<T>(() => readLS(key, initialRef.current))

  useEffect(() => {
    const sync = (e: Event) => {
      const changed =
        (e instanceof CustomEvent && e.detail === key) || (e instanceof StorageEvent && (e.key === key || e.key === null))
      if (changed) setValue(readLS(key, initialRef.current))
    }
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [key])

  const set = useCallback<Setter<T>>(
    (next) => {
      const resolved =
        typeof next === 'function' ? (next as (prev: T) => T)(readLS(key, initialRef.current)) : next
      writeLS(key, resolved)
      setValue(resolved)
    },
    [key],
  )

  return [value, set]
}
