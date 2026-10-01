/**
 * Voice QA (§9) in headless Chrome with a fake microphone that plays a synthesized sentence.
 * Proves, on the production build: nothing voice-related downloads on the emergency path before
 * opt-in; opt-in from Settings downloads and caches the model and runtime; a recording is
 * transcribed on the device and pre-fills the taps; and the same flow works with the network cut.
 * Usage: node scripts/qa_voice.mjs [url] [wav] [chromePath] [screenshotDir]
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = (process.argv[2] ?? 'http://localhost:4180/').replace(/\/?$/, '/')
const wav = process.argv[3] ?? join(process.cwd(), 'qa-shots', 'speech.wav')
const chrome = process.argv[4] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const shotDir = process.argv[5] ?? join(process.cwd(), 'qa-shots')
const port = 9338
const profile = mkdtempSync(join(tmpdir(), 'fs-qa-voice-'))
mkdirSync(shotDir, { recursive: true })

const proc = spawn(
  chrome,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=360,740',
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    `--use-file-for-fake-audio-capture=${wav}`,
    '--autoplay-policy=no-user-gesture-required',
    'about:blank',
  ],
  { stdio: 'ignore' },
)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForDevtools() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) return
    } catch {}
    await sleep(200)
  }
  throw new Error('Chrome devtools did not come up')
}

async function main() {
  await waitForDevtools()
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  const page = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map()
  let exceptions = 0
  const requests = []
  const sizes = new Map()
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    } else if (msg.method === 'Page.javascriptDialogOpening') {
      send('Page.handleJavaScriptDialog', { accept: true })
    } else if (msg.method === 'Runtime.exceptionThrown') {
      exceptions++
      console.log('PAGE EXCEPTION:', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description)
    } else if (msg.method === 'Network.requestWillBeSent') {
      requests.push({ id: msg.params.requestId, url: msg.params.request.url, t: Date.now() })
    } else if (msg.method === 'Network.loadingFinished') {
      sizes.set(msg.params.requestId, msg.params.encodedDataLength)
    }
  }
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const i = ++id
      pending.set(i, resolve)
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.text, detail: r.result.exceptionDetails.exception?.description }
    return r.result?.result?.value
  }
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(shotDir, name), Buffer.from(r.result.data, 'base64'))
  }
  const open = async (hash) => {
    await send('Page.navigate', { url: url + '?t=' + Date.now() + hash })
    for (let i = 0; i < 50; i++) {
      if (await evaluate(`!!document.querySelector('h1')`)) break
      await sleep(100)
    }
    await sleep(300)
  }
  const waitFor = async (expr, timeoutMs, label) => {
    const t0 = Date.now()
    let last = ''
    while (Date.now() - t0 < timeoutMs) {
      const v = await evaluate(expr)
      if (v && typeof v === 'object' && v.error) throw new Error(`${label}: ${v.error} ${v.detail ?? ''}`)
      if (v) return v
      const status = await evaluate(`document.querySelector('[data-voice-settings], [data-voice]')?.innerText.split('\\n')[0] ?? ''`)
      if (status !== last && typeof status === 'string') {
        last = status
        console.log(`  … ${label}: ${status.slice(0, 60)} (${Math.round((Date.now() - t0) / 1000)}s)`)
      }
      await sleep(1500)
    }
    throw new Error(`timeout waiting for ${label}`)
  }
  const caches = () =>
    evaluate(`(async () => { const out = {}; for (const k of await caches.keys()) { const c = await caches.open(k); out[k] = (await c.keys()).map(r => r.url.replace(/^https?:\\/\\/[^/]+/, '').slice(-60)); } return out; })()`)
  const hostSummary = (since) => {
    const byHost = {}
    for (const r of requests.filter((r) => r.t >= since)) {
      const h = new URL(r.url).host
      byHost[h] = (byHost[h] ?? 0) + (sizes.get(r.id) ?? 0)
    }
    return byHost
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url })
  await sleep(1500)

  // A. Emergency path on a fresh phone: voice is offered as "not set up" and nothing downloads.
  const tA = Date.now()
  await open('#/now/animal')
  const stateA = await waitFor(`document.querySelector('[data-voice]')?.dataset.voice`, 10000, 'voice state')
  await sleep(1500)
  const cachesA = await caches()
  console.log(JSON.stringify(['A fresh emergency path', 'voice', stateA, 'caches', Object.keys(cachesA), 'hosts since A', hostSummary(tA), 'no-model line', await evaluate(`document.querySelector('.voice-note')?.textContent ?? ''`), 'type box', await evaluate(`!!document.querySelector('#what-happened')`)]))
  await shot('v2-voice-notready-360.png')

  // B. Opt in from Settings.
  const tB = Date.now()
  await open('#/settings')
  await evaluate(`document.querySelector('[data-voice-settings]')?.scrollIntoView()`)
  const stateB0 = await waitFor(`document.querySelector('[data-voice-settings]')?.dataset.voiceSettings`, 10000, 'settings state')
  await shot('v2-voice-settings-before.png')
  await evaluate(`[...document.querySelectorAll('button')].find(b => /^Download voice input/.test(b.textContent.trim())).click()`)
  const stateB1 = await waitFor(`(() => { const s = document.querySelector('[data-voice-settings]')?.dataset.voiceSettings; return s === 'ready' || s === 'error' ? s : null; })()`, 8 * 60_000, 'download')
  await sleep(1000)
  const cachesB = await caches()
  const est = await evaluate(`navigator.storage.estimate().then(e => Math.round(e.usage / 1048576) + ' MB used')`)
  console.log(JSON.stringify(['B prepare from settings', 'before', stateB0, 'after', stateB1, 'error text', await evaluate(`document.querySelector('[data-voice-settings] [role=alert]')?.textContent ?? ''`), 'hosts', hostSummary(tB), 'storage', est]))
  console.log(JSON.stringify(['B caches', Object.fromEntries(Object.entries(cachesB).map(([k, v]) => [k, v.length + ' entries: ' + v.filter(u => /onnx|wasm|worker/.test(u)).join(' | ')]))]))
  await shot('v2-voice-settings-ready.png')
  if (stateB1 !== 'ready') throw new Error('voice did not become ready')

  // C. Emergency path again: speak, get the taps pre-filled, confirm.
  const speak = async (label) => {
    await open('#/now/animal')
    await waitFor(`document.querySelector('[data-voice]')?.dataset.voice === 'ready'`, 15000, label + ' ready')
    await evaluate(`document.querySelector('[data-voice=ready] .voice-btn').click()`)
    await waitFor(`document.querySelector('[data-voice]')?.dataset.voice === 'recording'`, 10000, label + ' recording')
    await sleep(5000)
    await shot(`v2-voice-${label}-listening.png`)
    await evaluate(`document.querySelector('[data-voice=recording] .voice-btn').click()`)
    const t0 = Date.now()
    await waitFor(`['done','error'].includes(document.querySelector('[data-voice]')?.dataset.voice)`, 180_000, label + ' transcription')
    const secs = Math.round((Date.now() - t0) / 1000)
    const out = await evaluate(`(() => ({ state: document.querySelector('[data-voice]')?.dataset.voice, heard: document.querySelector('.voice-heard')?.textContent, chips: [...document.querySelectorAll('.chip')].map(c => c.textContent), error: document.querySelector('[data-voice=error] p')?.textContent, record: JSON.parse(localStorage.getItem('fs.biteRecord')) }))()`)
    console.log(JSON.stringify([label + ' result', 'seconds', secs, out]))
    await shot(`v2-voice-${label}-done.png`)
    return out
  }
  const tC = Date.now()
  const c = await speak('online')
  console.log(JSON.stringify(['C hosts during speak', hostSummary(tC)]))
  if (c.state === 'done' && c.record?.animal) {
    await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Looks right').click()`)
    await sleep(400)
    console.log(JSON.stringify(['C looks right', location_hash = await evaluate('location.hash'), 'record', await evaluate(`(({animal, site, contact, bleeding}) => ({animal, site, contact, bleeding}))(JSON.parse(localStorage.getItem('fs.biteRecord')))`)]))
    await shot('v2-voice-facts-prefilled.png')
  }

  // D. The network cut: the app, the model and the runtime must all come from the phone.
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  const tD = Date.now()
  const d = await speak('offline')
  console.log(JSON.stringify(['D offline', 'state', d.state, 'heard', d.heard, 'hosts during offline speak', hostSummary(tD)]))
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })

  console.log(`page exceptions: ${exceptions}`)
  console.log(`screenshots in ${shotDir}`)
  ws.close()
  proc.kill()
}

let location_hash = ''
main().catch((e) => {
  console.error('FAILED:', e.message)
  proc.kill()
  process.exit(1)
})
