/**
 * §12: "15-minute timer survives the screen locking and the app backgrounding."
 * Starts the timer from the v2 entry screen, then FREEZES the page (Page.setWebLifecycleState -
 * what Chrome does to a backgrounded or screen-locked tab: no JS, no timers run), waits real time,
 * unfreezes and checks the countdown shows true elapsed time. Then a full reload. Headless Chrome.
 * Usage: node scripts/qa_timer_v2.mjs [url]
 */
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = (process.argv[2] ?? 'http://localhost:4180/').replace(/\/?$/, '/')
const port = 9612
const profile = mkdtempSync(join(tmpdir(), 'fs-timer2-'))
const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--window-size=390,844', 'about:blank'],
  { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break } catch {}
    await sleep(200)
  }
  const t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page')
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map()
  ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) } }
  const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value
  const secs = (d) => { const [m, s] = String(d).split(':').map(Number); return m * 60 + s }
  const digits = () => ev(`document.querySelector('.timer-digits')?.textContent?.trim() ?? null`)
  const results = []

  await send('Page.enable'); await send('Runtime.enable')
  await send('Page.navigate', { url })
  await sleep(1500)
  await ev(`document.querySelector('.entry-btn.red').click()`)
  await sleep(1200)
  const d0 = await digits()
  results.push(['started from the red button', await ev('location.hash'), d0])

  await send('Page.setWebLifecycleState', { state: 'frozen' })
  const frozenAt = Date.now()
  await sleep(9000)
  await send('Page.setWebLifecycleState', { state: 'active' })
  await ev(`document.dispatchEvent(new Event('visibilitychange'))`)
  await sleep(600)
  const d1 = await digits()
  const realGap = Math.round((Date.now() - frozenAt) / 1000)
  const shown = secs(d0) - secs(d1)
  results.push(['frozen like a locked phone for ~9 s', d0, '->', d1, 'shown drop', shown, 's; real', realGap, 's', Math.abs(shown - realGap) <= 2 ? 'PASS' : 'FAIL'])

  await sleep(3000)
  const before = await digits()
  await send('Page.reload', {})
  await sleep(2000)
  await ev(`location.hash === '#/now/step/1' || (location.hash = '#/now/step/1')`)
  await sleep(800)
  const after = await digits()
  const drop = secs(before) - secs(after)
  results.push(['full reload', before, '->', after, drop >= 1 && drop <= 5 ? 'PASS (kept counting)' : 'FAIL'])

  for (const r of results) console.log(JSON.stringify(r))
  ws.close(); proc.kill()
}
main().catch((e) => { console.error(e); proc.kill(); process.exit(1) })
