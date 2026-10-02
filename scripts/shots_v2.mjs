/**
 * Screenshots of every v2 screen at 360x740 (light), for a visual pass. Headless Chrome.
 * Usage: node scripts/shots_v2.mjs [url] [outDir]
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = (process.argv[2] ?? 'http://localhost:4180/').replace(/\/?$/, '/')
const out = process.argv[3] ?? join(process.cwd(), 'qa-shots')
const port = 9613
mkdirSync(out, { recursive: true })
const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'fs-shots-'))}`, '--no-first-run', '--window-size=360,740', 'about:blank'],
  { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break } catch {} await sleep(200) }
  const t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page')
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map()
  ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) } }
  const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value
  const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(out, name), Buffer.from(r.result.data, 'base64')) }
  const open = async (hash) => { await send('Page.navigate', { url: url + '?t=' + Date.now() + hash }); for (let i = 0; i < 100; i++) { if (await ev(`!!document.querySelector('h1')`)) break; await sleep(100) } await sleep(700) }

  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true })
  await open('#/'); await shot('p-entry.png')
  await ev(`document.querySelector('.entry-btn.red').click()`); await sleep(2500); await shot('p-step1.png')
  await open('#/now/step/3'); await shot('p-step3.png')
  await open('#/now/go'); await shot('p-final.png')
  await open('#/now/animal'); await shot('p-picker.png')
  await open('#/learn'); await shot('p-learn.png')
  await open('#/settings'); await ev(`[...document.querySelectorAll('h3')].find(h => /Online help/.test(h.textContent))?.scrollIntoView()`); await sleep(300); await shot('p-settings.png')
  ws.close(); proc.kill()
  console.log('saved to', out)
}
main().catch((e) => { console.error(e); proc.kill(); process.exit(1) })
