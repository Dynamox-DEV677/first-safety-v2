import { useCallback, useEffect, useState } from 'react'
import { WASH_SECONDS } from '../data/nowMode'
import { readLS, useLocalStorage, writeLS } from './useLocalStorage'
import { setFlag } from './flags'
import { recordWashSeconds, updateBiteRecord } from './useBiteRecord'

/**
 * The 15-minute wound-wash countdown.
 *
 * Remaining time is always recomputed from a stored wall-clock start timestamp, never from an
 * in-memory counter, so the timer survives navigation, a locked phone and a full reload.
 *
 * "Not started" is an EXPLICIT state, never something derived by doing arithmetic against a
 * missing or zero timestamp. A missing, malformed, zero or future startedAt means not started
 * and shows the full 15:00 - it must never render as "done", which is how a stale record from a
 * previous session used to blank out the Start button on a fresh bite.
 */
export type TimerStatus = 'idle' | 'running' | 'done'

export interface TimerState {
  startedAt: number
  duration: number
  alerted: boolean
}

export const TIMER_KEY = 'fs.timer'
export const TIMER_BANNER_KEY = 'fs.timerDismissed'

/**
 * A 15-minute timer started more than this long ago is a leftover, not a wash in progress.
 * Treating it as "not started" keeps an old record from ever presenting as a finished wash.
 */
const STALE_AFTER_MS = 12 * 60 * 60 * 1000

/** Validate whatever is in storage. Anything that is not a real start time yields null. */
export function parseTimer(raw: unknown, now: number = Date.now()): TimerState | null {
  if (raw === null || typeof raw !== 'object') return null
  const { startedAt, duration, alerted } = raw as Partial<TimerState>
  if (typeof startedAt !== 'number' || !Number.isFinite(startedAt) || startedAt <= 0) return null
  if (startedAt > now + 60_000) return null          // clock skew or a corrupt future stamp
  if (now - startedAt > STALE_AFTER_MS) return null  // a leftover from an earlier session
  const dur = typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? duration : WASH_SECONDS
  return { startedAt, duration: dur, alerted: Boolean(alerted) }
}

/** Wipe any wash-timer state. Called when a new bite session begins, and by Reset all data. */
export function clearWashTimer(): void {
  writeLS(TIMER_KEY, null)
  writeLS(TIMER_BANNER_KEY, null)
}

/* ---- audio alert (Web Audio, no asset files, works offline) ---- */
let audioCtx: AudioContext | null = null
let alarmedFor: number | null = null

export function unlockAudio(): void {
  try {
    audioCtx ??= new AudioContext()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
  } catch {
    audioCtx = null
  }
}

function beep(ctx: AudioContext, at: number, freq: number, dur: number): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.6, at + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + dur + 0.05)
}

function playAlarm(): void {
  try {
    unlockAudio()
    if (!audioCtx) return
    const t = audioCtx.currentTime + 0.05
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 3; i++) beep(audioCtx, t + r * 1.2 + i * 0.25, 880, 0.18)
    }
  } catch {
    // no audio: the visual state and vibration still signal completion
  }
}

function vibrate(): void {
  try {
    navigator.vibrate?.([400, 200, 400, 200, 800])
  } catch {
    // unsupported
  }
}

export function useTimer() {
  const [stored, setStored] = useLocalStorage<unknown>(TIMER_KEY, null)
  const [now, setNow] = useState<number>(() => Date.now())

  const state = parseTimer(stored, now)

  const total = state?.duration ?? WASH_SECONDS
  // Only ever computed when there is a real start timestamp.
  const elapsed = state ? Math.min(total, Math.max(0, (now - state.startedAt) / 1000)) : 0
  const remaining = state ? Math.max(0, total - elapsed) : total
  const status: TimerStatus = !state ? 'idle' : remaining > 0 ? 'running' : 'done'

  useEffect(() => {
    if (status !== 'running') return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [status])

  // Recompute the moment the tab comes back, so a phone that was locked shows the truth at once.
  useEffect(() => {
    const sync = () => setNow(Date.now())
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  useEffect(() => {
    if (status === 'done' && state && !state.alerted && alarmedFor !== state.startedAt) {
      alarmedFor = state.startedAt
      playAlarm()
      vibrate()
      setFlag('timerDone')
      recordWashSeconds(state.duration)
      setStored({ ...state, alerted: true })
    }
  }, [status, state, setStored])

  const start = useCallback(() => {
    unlockAudio()
    const startedAt = Date.now()
    alarmedFor = null
    setStored({ startedAt, duration: WASH_SECONDS, alerted: false })
    writeLS(TIMER_BANNER_KEY, null)
    setNow(startedAt)
    updateBiteRecord({ washStartedAt: new Date(startedAt).toISOString() })
  }, [setStored])

  const reset = useCallback(() => {
    const current = parseTimer(readLS<unknown>(TIMER_KEY, null))
    if (current) recordWashSeconds(Math.min(current.duration, (Date.now() - current.startedAt) / 1000))
    alarmedFor = null
    setStored(null)
    writeLS(TIMER_BANNER_KEY, null)
  }, [setStored])

  return { status, remaining, elapsed, total, startedAt: state?.startedAt ?? null, start, reset }
}

/** "MM:SS". Remaining time rounds up so the display never shows 00:00 while time is left. */
export function fmt(seconds: number, mode: 'up' | 'down' = 'up'): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  const s = mode === 'up' ? Math.ceil(safe) : Math.floor(safe)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
