/**
 * P0 verification for the 15-minute wash timer, plus horizontal-overflow measurement.
 * Usage: node scripts/qa_timer.mjs [url] [chromePath] [shotDir]
 *
 * Runs at a 390px phone viewport, from a genuinely clean profile, and reproduces the reported
 * failure first (a finished timer left over from an earlier session) before checking the fix.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = (process.argv[2] ?? 'http://localhost:4180/').replace(/\/?$/, '/')
const chrome = process.argv[3] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const shotDir = process.argv[4] ?? join(process.cwd(), 'qa-shots')
const port = 9611
mkdirSync(shotDir, { recursive: true })
const profile = mkdtempSync(join(tmpdir(), 'fs-timer-'))

const proc = spawn(
  chrome,
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run',
   '--no-default-browser-check', '--window-size=390,844', 'about:blank'],
  { stdio: 'ignore' },
)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break } catch {}
    await sleep(200)
  }
  const t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page')
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))

  let id = 0
  const pending = new Map()
  const exceptions = []
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data)
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id) }
    else if (d.method === 'Runtime.exceptionThrown') exceptions.push(d.params?.exceptionDetails?.text ?? 'exception')
  }
  const send = (method, params = {}) =>
    new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (e) => {
    const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) return { __error: r.result.exceptionDetails.text }
    return r.result?.result?.value
  }
  const viewport = (w, h = 844) =>
    send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true })
  const goto = async (hash) => {
    await send('Page.navigate', { url: `${url}?t=${Date.now()}${hash}` })
    for (let i = 0; i < 70; i++) {
      if (await ev(`!!document.querySelector('h1, .btn-hero')`)) break
      await sleep(100)
    }
    await sleep(220)
  }
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' })
    if (r.result?.data) writeFileSync(join(shotDir, name), Buffer.from(r.result.data, 'base64'))
  }
  const timerState = () =>
    ev(`(() => {
      const digits = document.querySelector('.timer-digits')?.textContent?.trim() ?? null;
      const label  = document.querySelector('.timer-label')?.textContent?.trim() ?? null;
      const meta   = [...document.querySelectorAll('.timer-meta span')].map(s => s.textContent.trim());
      const btns   = [...document.querySelectorAll('.timer button')].map(b => b.textContent.trim());
      const done   = document.querySelector('.timer-done')?.textContent?.trim() ?? null;
      return { digits, label, meta, btns, done, stored: JSON.parse(localStorage.getItem('fs.timer') || 'null') };
    })()`)

  await send('Page.enable'); await send('Runtime.enable')
  await viewport(390)
  const log = []

  // ---------------------------------------------------------------- reproduce the reported failure
  await goto('#/')
  await ev(`localStorage.clear()`)
  // A finished wash timer left behind by an earlier session, exactly as a real phone would have.
  await ev(`localStorage.setItem('fs.timer', JSON.stringify({ startedAt: Date.now() - 40*60*1000, duration: 900, alerted: true }))`)
  await goto('#/')
  await ev(`[...document.querySelectorAll('a.btn')].find(a => /been bitten/i.test(a.textContent))?.click()`)
  await sleep(320)
  await ev(`[...document.querySelectorAll('.actions .btn-solid, button.btn-solid')].find(b => /Start washing/i.test(b.textContent))?.click()`)
  await sleep(420)
  log.push(['1 fresh bite after a stale finished timer', await timerState()])
  await shot('50-timer-fresh.png')

  // ---------------------------------------------------------------- start and count down
  await ev(`[...document.querySelectorAll('.timer button')].find(b => /Start the 15-minute timer/i.test(b.textContent))?.click()`)
  await sleep(6000)
  log.push(['2 counting down after ~6s', await timerState()])
  await shot('51-timer-counting.png')

  // ---------------------------------------------------------------- survives a full reload
  await sleep(26000)
  await goto('#/now/step/1')
  log.push(['3 after ~32s total, full page reload', await timerState()])
  await shot('52-timer-after-reload.png')

  // ---------------------------------------------------------------- survives navigating away
  await goto('#/learn')
  await sleep(400)
  await goto('#/now/step/1')
  log.push(['4 back from Learn', await timerState()])

  // ---------------------------------------------------------------- a brand new bite resets it
  await goto('#/')
  await ev(`[...document.querySelectorAll('a.btn')].find(a => /been bitten/i.test(a.textContent))?.click()`)
  await sleep(320)
  await ev(`[...document.querySelectorAll('.actions .btn-solid, button.btn-solid')].find(b => /Start washing/i.test(b.textContent))?.click()`)
  await sleep(420)
  log.push(['5 brand new bite resets to a full 15:00', await timerState()])

  // ---------------------------------------------------------------- Reset all data clears it
  await ev(`localStorage.setItem('fs.timer', JSON.stringify({ startedAt: Date.now()-30000, duration: 900, alerted: false }))`)
  await goto('#/settings')
  await ev(`window.confirm = () => true`)
  await ev(`[...document.querySelectorAll('button')].find(b => /Reset all data/i.test(b.textContent))?.click()`)
  await sleep(1200)
  log.push(['6 after Reset all data', await ev(`({ timer: localStorage.getItem('fs.timer'), banner: localStorage.getItem('fs.timerDismissed'), fsKeys: Object.keys(localStorage).filter(k=>k.startsWith('fs.')) })`)])

  // ---------------------------------------------------------------- horizontal overflow
  const overflow = {}
  for (const w of [360, 390, 414, 629]) {
    await viewport(w)
    await goto('#/now/step/1')
    await ev(`[...document.querySelectorAll('.timer button')].find(b => /Start the 15-minute timer/i.test(b.textContent))?.click()`)
    await sleep(500)
    overflow[w] = await ev(`(() => {
      const de = document.documentElement;
      const vw = de.clientWidth;
      const offenders = [...document.querySelectorAll('body *')].map(el => {
        const r = el.getBoundingClientRect();
        return { r, el };
      }).filter(({ r }) => r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5))
        .map(({ r, el }) => ({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 40),
          left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
          txt: (el.textContent || '').trim().slice(0, 24),
        }));
      return { scrollWidth: de.scrollWidth, clientWidth: vw, overflows: de.scrollWidth > vw, offenders: offenders.slice(0, 8) };
    })()`)
    if (w === 390) await shot('53-step1-390.png')
    if (w === 629) await shot('54-step1-629.png')
  }
  log.push(['7 horizontal overflow', overflow])

  log.push(['exceptions', exceptions.length, exceptions.slice(0, 3)])
  console.log(JSON.stringify(log, null, 1))
  ws.close()
}

main().catch((e) => { console.error('FAILED', e); process.exitCode = 1 }).finally(() => proc.kill())
