/**
 * Offline / service-worker smoke test using headless Chrome over the DevTools protocol.
 * Usage: node scripts/check_sw.mjs [url] [chromePath] [screenshotDir]
 * Requires the production build to be served (npm run preview) at the given URL.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = process.argv[2] ?? 'http://localhost:4173/'
const chrome = process.argv[3] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const shotDir = process.argv[4] ?? join(process.cwd(), 'qa-shots')
const port = 9333
const profile = mkdtempSync(join(tmpdir(), 'fs-chrome-'))
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
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForDevtools() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (res.ok) return
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
  const events = []
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    } else if (msg.method) events.push(msg)
  }
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const i = ++id
      pending.set(i, resolve)
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.text }
    return r.result?.result?.value
  }
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(shotDir, name), Buffer.from(r.result.data, 'base64'))
  }
  const waitForH1 = async (timeoutMs = 8000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < timeoutMs) {
      const h = await evaluate(`document.querySelector('h1, .btn-hero')?.textContent || ''`)
      if (h) return h
      await sleep(150)
    }
    return ''
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true })

  const out = {}

  // 1. first load online: SW installs and precaches
  await send('Page.navigate', { url })
  await waitForH1()
  out.online = await evaluate(`(async () => {
    const reg = await navigator.serviceWorker.ready;
    await new Promise(r => setTimeout(r, 2500));
    const keys = await caches.keys();
    let cached = 0;
    for (const k of keys) cached += (await (await caches.open(k)).keys()).length;
    return { scope: reg.scope, state: reg.active && reg.active.state, caches: keys, cached, title: document.title,
             manifest: document.querySelector('link[rel=manifest]')?.getAttribute('href') };
  })()`)
  await shot('01-home.png')

  await send('Page.navigate', { url: url.replace(/\/?$/, '/') + '#/now/step/1' })
  await waitForH1()
  await sleep(300)
  await shot('02-step1-timer.png')

  // 2. go offline and cold-load a deep route
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await send('Page.navigate', { url: url.replace(/\/?$/, '/') + '#/now/go' })
  const offlineH1 = await waitForH1()
  out.offline = {
    h1: offlineH1,
    controller: await evaluate(`!!navigator.serviceWorker.controller`),
    online: await evaluate(`navigator.onLine`),
  }
  await sleep(300)
  await shot('03-offline-final.png')

  await send('Page.navigate', { url: url.replace(/\/?$/, '/') + '#/learn' })
  out.offlineLearnH1 = await waitForH1()
  await sleep(300)
  await shot('04-offline-learn.png')

  await send('Page.navigate', { url: url.replace(/\/?$/, '/') + '#/now/help' })
  await waitForH1()
  await sleep(300)
  await shot('05-offline-help.png')

  console.log(JSON.stringify(out, null, 2))
  ws.close()
}

main()
  .catch((e) => {
    console.error('FAILED', e)
    process.exitCode = 1
  })
  .finally(() => proc.kill())
