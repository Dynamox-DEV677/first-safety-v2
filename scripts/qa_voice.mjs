/**
 * Voice QA (§9) in headless Chrome with a fake microphone that plays a synthesized sentence.
 * Proves, on the production build: on a fresh phone the emergency screen shows its buttons at once
 * while the model installs itself in the background, and the mic appears on that same screen with
 * no tap (and is announced); the model and runtime are cached; a recording is transcribed on the
 * device and pre-fills the taps; the same works with the network cut; and after Remove or Stop,
 * voice does not download by itself again.
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
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'warning') {
      console.log('PAGE WARNING:', msg.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300))
    } else if (msg.method === 'Target.attachedToTarget') {
      // The speech worker is its own target: watch its network too, or its downloads go unseen.
      sendTo(msg.params.sessionId, 'Network.enable')
    } else if (msg.method === 'Network.requestWillBeSent') {
      requests.push({ id: msg.params.requestId, url: msg.params.request.url, t: Date.now(), worker: !!msg.sessionId })
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
  const sendTo = (sessionId, method, params = {}) =>
    new Promise((resolve) => {
      const i = ++id
      pending.set(i, resolve)
      ws.send(JSON.stringify({ id: i, method, params, sessionId }))
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
  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true })
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true })

  // A. A fresh phone, opened straight onto the emergency voice screen: the buttons are there at once,
  //    the model installs itself, and the mic appears on this same screen with no tap.
  const tA = Date.now()
  await send('Page.navigate', { url: url + '#/now/animal' })
  const stateA0 = await waitFor(`document.querySelector('[data-voice]')?.dataset.voice`, 15000, 'voice state')
  const firstA = { line: await evaluate(`document.querySelector('.voice-note')?.textContent ?? ''`), buttons: await evaluate(`document.querySelectorAll('main button').length`), typeBox: await evaluate(`!!document.querySelector('#what-happened')`) }
  await shot('v2-voice-notready-360.png')
  const lineA1 = await waitFor(`(() => { const t = document.querySelector('.voice-note')?.textContent ?? ''; return /downloading/i.test(t) ? t : document.querySelector('[data-voice]')?.dataset.voice === 'ready' ? '(ready before the line was seen)' : null; })()`, 60_000, 'download starts')
  await shot('v2-voice-downloading-360.png')
  await waitFor(`document.querySelector('[data-voice]')?.dataset.voice === 'ready'`, 8 * 60_000, 'auto install')
  const secsA = Math.round((Date.now() - tA) / 1000)
  const hostsA = hostSummary(tA)
  const workerFiles = requests.filter((r) => r.worker && r.t >= tA).map((r) => new URL(r.url).pathname.split('/').pop())
  console.log(JSON.stringify(['A fresh phone, emergency screen', 'first', stateA0, firstA, 'while installing', lineA1, 'mic after (s)', secsA, 'announced', await evaluate(`document.querySelector('.voice .sr-only[role=status]')?.textContent ?? ''`), 'hosts (page + worker)', hostsA, 'third-party hosts', Object.keys(hostsA).filter((h) => h && h !== new URL(url).host)]))
  console.log(JSON.stringify(['A worker fetched', [...new Set(workerFiles)]]))
  await shot('v2-voice-autoready-360.png')

  // B. Settings agrees with no tap, and the LEARN card is gone once it is done.
  await open('#/settings')
  await evaluate(`document.querySelector('[data-voice-settings]')?.scrollIntoView()`)
  const stateB = await waitFor(`document.querySelector('[data-voice-settings]')?.dataset.voiceSettings`, 10000, 'settings state')
  const cachesB = await caches()
  const est = await evaluate(`navigator.storage.estimate().then(e => Math.round(e.usage / 1048576) + ' MB used')`)
  console.log(JSON.stringify(['B settings, no tap', stateB, 'storage', est]))
  console.log(JSON.stringify(['B caches', Object.fromEntries(Object.entries(cachesB).map(([k, v]) => [k, v.length + ' entries: ' + v.filter(u => /onnx|wasm|worker/.test(u)).join(' | ')]))]))
  await shot('v2-voice-settings-ready.png')
  await open('#/learn')
  console.log(JSON.stringify(['B learn card after install', await evaluate(`!!document.querySelector('.offer')`)]))
  if (stateB !== 'ready') throw new Error('voice did not become ready')

  // C. Emergency path again: speak, get the taps pre-filled, confirm.
  const speak = async (label, recordMs = 5000) => {
    await open('#/now/animal')
    await waitFor(`document.querySelector('[data-voice]')?.dataset.voice === 'ready'`, 15000, label + ' ready')
    await evaluate(`document.querySelector('[data-voice=ready] .voice-btn').click()`)
    await waitFor(`document.querySelector('[data-voice]')?.dataset.voice === 'recording'`, 10000, label + ' recording')
    await sleep(recordMs)
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
  // C0. Tap the mic the moment it shows and stop fast: the transcription is asked for while the model
  //     is still warming up, and must still get its own answer (not the warm-up's "ready").
  const race = await speak('race', 1500)
  console.log(JSON.stringify(['C0 mic tapped during warm-up', race.state, race.error ?? '']))

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

  // E. Remove: the files go, and voice does not download by itself again on this phone.
  await open('#/settings')
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Remove voice files').click()`)
  await waitFor(`['not-ready', 'error'].includes(document.querySelector('[data-voice-settings]')?.dataset.voiceSettings)`, 15000, 'removed')
  const tE = Date.now()
  await open('#/now/animal')
  await sleep(8000)
  console.log(JSON.stringify(['E after remove + reload', 'voice', await evaluate(`document.querySelector('[data-voice]')?.dataset.voice`), 'line', await evaluate(`document.querySelector('.voice-note')?.textContent ?? ''`), 'auto', await evaluate(`localStorage.getItem('fs.voiceAuto')`), 'hosts since', hostSummary(tE), 'voice caches left', Object.keys(await caches()).filter((k) => /transformers|fs-voice/.test(k))]))

  // F. Download by hand on a slow line, then Stop: the download ends and stays off.
  await send('Network.setCacheDisabled', { cacheDisabled: true })
  await send('Network.emulateNetworkConditions', { offline: false, latency: 50, downloadThroughput: 250_000, uploadThroughput: 250_000 })
  await open('#/settings')
  await evaluate(`document.querySelector('[data-voice-settings]')?.scrollIntoView()`)
  await evaluate(`[...document.querySelectorAll('button')].find(b => /^Download voice input/.test(b.textContent.trim())).click()`)
  await waitFor(`document.querySelector('[data-voice-settings]')?.dataset.voiceSettings === 'preparing'`, 15000, 'manual download')
  await sleep(3000)
  await shot('v2-voice-settings-downloading.png')
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Stop download').click()`)
  await sleep(1500)
  const tF = Date.now()
  await sleep(5000)
  console.log(JSON.stringify(['F stop', 'settings', await evaluate(`document.querySelector('[data-voice-settings]')?.dataset.voiceSettings`), 'note', await evaluate(`[...document.querySelectorAll('[data-voice-settings] .small')].pop()?.textContent ?? ''`), 'auto', await evaluate(`localStorage.getItem('fs.voiceAuto')`), 'requests after stop', requests.filter((r) => r.t >= tF).map((r) => new URL(r.url).host)]))
  await shot('v2-voice-settings-stopped.png')
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await send('Network.setCacheDisabled', { cacheDisabled: false })

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
