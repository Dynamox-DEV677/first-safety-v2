/**
 * Full-page screenshots for review. Seeds localStorage so the states of interest are visible
 * without needing live location or network.
 * Usage: node scripts/shots.mjs <url> <chromePath> <outDir>
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = (process.argv[2] ?? 'http://localhost:4180/').replace(/\/?$/, '/')
const chrome = process.argv[3] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const outDir = process.argv[4] ?? join(process.cwd(), 'qa-shots')
const port = 9455
mkdirSync(outDir, { recursive: true })
const profile = mkdtempSync(join(tmpdir(), 'fs-shots-'))

const SEED = `
(() => {
  const now = Date.now();
  const items = [
    { id: 'n/1', name: 'Government Kilpauk Medical College', lat: 13.0877, lng: 80.2707, distanceM: 556, phone: '04426612222', area: 'Kilpauk' },
    { id: 'w/2', name: 'Rajiv Gandhi Government General Hospital', lat: 13.0927, lng: 80.2707, distanceM: 1112, phone: '+914425305000', area: 'Park Town' },
    { id: 'n/3', name: 'Hospital (unnamed on the map)', lat: 13.1027, lng: 80.2707, distanceM: 2224, phone: null, area: null },
    { id: 'n/4', name: 'Egmore Childrens Hospital', lat: 13.1127, lng: 80.2707, distanceM: 3336, phone: null, area: 'Egmore' },
    { id: 'r/5', name: 'Stanley Medical College', lat: 13.1227, lng: 80.2707, distanceM: 4448, phone: null, area: null }
  ];
  try {
    localStorage.setItem('fs.geo', JSON.stringify({ lat: 13.0827, lng: 80.2707, at: now }));
    localStorage.setItem('fs.nearby', JSON.stringify({ at: now - 120000, from: { lat: 13.0827, lng: 80.2707 }, items }));
    localStorage.setItem('fs.medical', JSON.stringify({
      name: '', ageYears: null, weightKg: null, bloodGroup: '', everVaccinated: '', previousRabiesDoses: '',
      tetanusLastDate: '', allergies: '', conditions: '', medicines: '',
      emergencyContacts: [
        { name: 'Amma', relation: 'Mother', phone: '+91 98765 43210' },
        { name: 'School nurse', relation: '', phone: '044 2661 2222' },
        { name: '', relation: '', phone: '' }
      ]
    }));
    localStorage.setItem('fs.state', JSON.stringify('Tamil Nadu'));
  } catch (e) {}
})();
`

const proc = spawn(
  chrome,
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'],
  { stdio: 'ignore' },
)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break
    } catch {}
    await sleep(200)
  }
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  const page = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))

  let id = 0
  const pending = new Map()
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const i = ++id
      pending.set(i, resolve)
      ws.send(JSON.stringify({ id: i, method, params }))
    })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: SEED })

  const capture = async (hash, name) => {
    await send('Page.navigate', { url: `${url}?s=${Date.now()}${hash}` })
    for (let i = 0; i < 50; i++) {
      const r = await send('Runtime.evaluate', { expression: `!!document.querySelector('h1')`, returnByValue: true })
      if (r.result?.result?.value) break
      await sleep(100)
    }
    await sleep(600)
    // Hide the sticky bottom bars so a tall capture is not covered by them.
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.actions, .bnav').forEach(e => e.style.position = 'static'); true`,
      returnByValue: true,
    })
    const m = await send('Page.getLayoutMetrics')
    const h = Math.min(Math.ceil(m.result?.cssContentSize?.height ?? 740), 5000)
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: 360, height: h, scale: 2 },
    })
    if (shot.result?.data) {
      writeFileSync(join(outDir, name), Buffer.from(shot.result.data, 'base64'))
      console.log(`${name}  ${360}x${h}`)
    } else {
      console.log(`${name}  FAILED`)
    }
  }

  await capture('#/now/help', '25-help-full.png')
  await capture('#/settings', '26-settings-contact.png')

  // the confirm popup, captured at viewport size since it is an overlay
  await send('Page.navigate', { url: `${url}?s=${Date.now()}#/now/help` })
  for (let i = 0; i < 50; i++) {
    const r = await send('Runtime.evaluate', { expression: `!!document.querySelector('h1')`, returnByValue: true })
    if (r.result?.result?.value) break
    await sleep(100)
  }
  await sleep(500)
  await send('Runtime.evaluate', {
    expression: `[...document.querySelectorAll('button.btn')].find(b => /^Call Amma$/.test(b.textContent.trim()))?.click(); true`,
    returnByValue: true,
  })
  await sleep(600)
  const popup = await send('Page.captureScreenshot', { format: 'png' })
  if (popup.result?.data) {
    writeFileSync(join(outDir, '34-confirm-popup.png'), Buffer.from(popup.result.data, 'base64'))
    console.log('34-confirm-popup.png  360x740')
  }
  ws.close()
}

main()
  .catch((e) => {
    console.error('FAILED', e)
    process.exitCode = 1
  })
  .finally(() => proc.kill())
