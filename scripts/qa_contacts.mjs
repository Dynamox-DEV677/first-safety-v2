/**
 * Headless QA for the emergency contacts and the confirm-before-dialling popup.
 * Usage: node scripts/qa_contacts.mjs [url] [chromePath] [shotDir]
 *
 * Checks, in order:
 *   1. the "Add an emergency contact" fallback when nothing is saved
 *   2. saving contacts, then a real page reload, and they are still there
 *   3. the popup shows the right name and number; Cancel dials nothing; Call now hands off to tel:
 *   4. the same flow with the network emulated offline, asserting zero network requests
 *
 * tel: navigations are captured from Page.frameRequestedNavigation, so "did it dial" is observed
 * rather than inferred.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = (process.argv[2] ?? 'http://localhost:4180/').replace(/\/?$/, '/')
const chrome = process.argv[3] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const shotDir = process.argv[4] ?? join(process.cwd(), 'qa-shots')
const port = 9466
mkdirSync(shotDir, { recursive: true })
const profile = mkdtempSync(join(tmpdir(), 'fs-contacts-'))

const proc = spawn(
  chrome,
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=360,740', 'about:blank'],
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
  const exceptions = []
  const telNavs = []
  let requests = []
  let recording = false

  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
      return
    }
    if (msg.method === 'Runtime.exceptionThrown') exceptions.push(msg.params?.exceptionDetails?.text ?? 'exception')
    if (msg.method === 'Page.frameRequestedNavigation') {
      const u = msg.params?.url ?? ''
      if (u.startsWith('tel:')) telNavs.push(u)
    }
    if (recording && msg.method === 'Network.requestWillBeSent') requests.push(msg.params?.request?.url ?? '?')
  }

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const i = ++id
      pending.set(i, resolve)
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) return { __error: r.result.exceptionDetails.text }
    return r.result?.result?.value
  }
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' })
    if (r.result?.data) writeFileSync(join(shotDir, name), Buffer.from(r.result.data, 'base64'))
  }
  const goto = async (hash) => {
    await send('Page.navigate', { url: `${url}?t=${Date.now()}${hash}` })
    for (let i = 0; i < 50; i++) {
      if (await evaluate(`!!document.querySelector('h1, .btn-hero')`)) break
      await sleep(100)
    }
    await sleep(250)
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true })

  const log = []

  // Type into a React-controlled input found by aria-label.
  const fill = (label, value) =>
    evaluate(`(() => {
      const el = document.querySelector('[aria-label=${JSON.stringify(label)}]');
      if (!el) return 'missing: ' + ${JSON.stringify(label)};
      const d = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value');
      d.set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return 'ok';
    })()`)

  const clickText = (re, selector = 'button, a') =>
    evaluate(`(() => {
      const re = new RegExp(${JSON.stringify(re)});
      const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(x => re.test(x.textContent.trim()));
      if (!el) return false;
      el.click();
      return true;
    })()`)

  const modalState = () =>
    evaluate(`(() => {
      const m = document.querySelector('.modal');
      if (!m) return null;
      return {
        title: document.querySelector('#confirm-call-title')?.textContent.trim(),
        name: m.querySelector('.modal-name')?.textContent.trim(),
        phone: m.querySelector('.modal-phone')?.textContent.trim(),
        buttons: [...m.querySelectorAll('button')].map(b => b.textContent.trim()),
        role: m.getAttribute('role'),
        ariaModal: m.getAttribute('aria-modal'),
        focusedInside: m.contains(document.activeElement) || document.activeElement === m,
        bodyLocked: document.body.style.overflow === 'hidden',
      };
    })()`)

  // ---------------------------------------------------------------- 4. fallback with nothing saved
  await goto('#/now/help')
  await evaluate(`localStorage.clear()`)
  await goto('#/now/help')
  log.push([
    '4 fallback when nothing saved',
    await evaluate(`(() => {
      const a = [...document.querySelectorAll('a.btn')].find(x => /Add an emergency contact/.test(x.textContent));
      const dead = [...document.querySelectorAll('.page-main button.btn')].filter(b => /^Call /.test(b.textContent.trim())).length;
      return { label: a?.textContent.trim() ?? 'MISSING', href: a?.getAttribute('href'), strayCallButtons: dead };
    })()`),
  ])
  await shot('30-contacts-empty.png')

  // ---------------------------------------------------------------- 1. save, reload, persists
  await goto('#/settings')
  await fill('Contact 1 name', 'Mom')
  await fill('Contact 1 phone', '+91 98765 43210')
  await fill('Contact 2 name', 'School nurse')
  await fill('Contact 2 phone', '044 2661 2222')
  await sleep(300)
  log.push([
    '1 saved to localStorage',
    await evaluate(`(JSON.parse(localStorage.getItem('fs.medical') || 'null')?.emergencyContacts || []).filter(c => c.name && c.phone)`),
  ])
  await shot('31-contacts-settings.png')

  // a real reload, not a hash change
  await goto('#/settings')
  log.push([
    '1 still there after reload',
    await evaluate(`[...document.querySelectorAll('[aria-label$="name"], [aria-label$="phone"]')].map(i => i.value).filter(Boolean)`),
  ])

  // ---------------------------------------------------------------- 3. popup, cancel, then call
  await goto('#/now/help')
  log.push([
    '3 buttons on the emergency screen',
    await evaluate(`[...document.querySelectorAll('.page-main button.btn')].map(b => b.textContent.trim()).filter(t => /^Call /.test(t))`),
  ])

  await clickText('^Call Mom$')
  await sleep(250)
  const opened = await modalState()
  log.push(['3 popup contents', opened])
  await shot('32-confirm-call.png')

  telNavs.length = 0
  await clickText('^Cancel$')
  await sleep(400)
  log.push([
    '3 cancel',
    { modalGone: (await modalState()) === null, telNavigations: telNavs.length, bodyUnlocked: await evaluate(`document.body.style.overflow !== 'hidden'`) },
  ])

  // Escape should also cancel
  await clickText('^Call School nurse$')
  await sleep(200)
  const nurse = await modalState()
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await sleep(300)
  log.push(['3 escape cancels', { shownFor: nurse?.name, modalGone: (await modalState()) === null, telNavigations: telNavs.length }])

  // now really call
  await clickText('^Call Mom$')
  await sleep(200)
  await clickText('^Call now$')
  await sleep(600)
  log.push(['3 call now', { telNavigations: telNavs.slice() }])

  // ---------------------------------------------------------------- 2. offline, and no requests
  await goto('#/now/help')
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  telNavs.length = 0
  requests = []
  recording = true
  await clickText('^Call Mom$')
  await sleep(250)
  const offlineModal = await modalState()
  await clickText('^Call now$')
  await sleep(700)
  recording = false
  log.push([
    '2 offline flow',
    {
      popupShown: Boolean(offlineModal),
      phone: offlineModal?.phone,
      telNavigations: telNavs.slice(),
      networkRequestsDuringFlow: requests.filter((u) => !u.startsWith('tel:')),
    },
  ])
  await shot('33-confirm-offline.png')
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })

  // ---------------------------------------------------------------- no Supabase left anywhere
  log.push([
    '5 no network layer left in the bundle',
    await evaluate(`(async () => {
      const html = await (await fetch(location.origin + '/')).text();
      const src = (html.match(/assets\\/index-[A-Za-z0-9_-]+\\.js/) || [])[0];
      if (!src) return 'bundle not found';
      const js = await (await fetch(location.origin + '/' + src)).text();
      return { supabase: /supabase/i.test(js), deviceId: /fs\\.deviceId/.test(js), recoveryCode: /recovery code/i.test(js) };
    })()`),
  ])

  log.push(['exceptions', exceptions.length, exceptions.slice(0, 4)])
  console.log(JSON.stringify(log, null, 1))
  ws.close()
}

main()
  .catch((e) => {
    console.error('FAILED', e)
    process.exitCode = 1
  })
  .finally(() => proc.kill())
