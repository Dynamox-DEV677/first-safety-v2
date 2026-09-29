/**
 * Headless QA for the nearest-hospital lookup.
 * Usage: node scripts/qa_geo.mjs [url] [chromePath] [shotDir]
 *
 * Location cases: permission granted (Overpass stubbed with a realistic payload), permission
 * denied, and offline. Denied and offline are real - only the Overpass response is stubbed,
 * because the public instance returns 504 from this network.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = (process.argv[2] ?? 'http://localhost:4173/').replace(/\/?$/, '/')
const chrome = process.argv[3] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const shotDir = process.argv[4] ?? join(process.cwd(), 'qa-shots')
const port = 9444
const profile = mkdtempSync(join(tmpdir(), 'fs-geo-'))
mkdirSync(shotDir, { recursive: true })
const origin = new URL(url).origin

const CHENNAI = { lat: 13.0827, lng: 80.2707 }

/** Realistic Overpass payload: mixed node/way, phones and none, an unnamed one, a duplicate, out of order. */
const FIXTURE = {
  elements: [
    { type: 'node', id: 301, lat: 13.1427, lon: 80.2707, tags: { amenity: 'hospital', name: 'Far Away Clinic' } },
    { type: 'way', id: 202, center: { lat: 13.0927, lon: 80.2707 }, tags: { amenity: 'hospital', name: 'Rajiv Gandhi Government General Hospital', 'contact:phone': '+91 44 2530 5000', 'addr:suburb': 'Park Town' } },
    { type: 'node', id: 101, lat: 13.0877, lon: 80.2707, tags: { amenity: 'hospital', name: 'Government Kilpauk Medical College', phone: '044-26612222; 044-26612223', 'addr:suburb': 'Kilpauk' } },
    { type: 'node', id: 404, lat: 13.1027, lon: 80.2707, tags: { amenity: 'hospital' } },
    { type: 'node', id: 101, lat: 13.0877, lon: 80.2707, tags: { amenity: 'hospital', name: 'Government Kilpauk Medical College', phone: '044-26612222' } },
    { type: 'node', id: 505, lat: 13.1127, lon: 80.2707, tags: { amenity: 'hospital', name: 'Egmore Childrens Hospital', phone: '12' } },
    { type: 'relation', id: 606, center: { lat: 13.1227, lon: 80.2707 }, tags: { amenity: 'hospital', 'name:en': 'Stanley Medical College', operator: 'Govt of TN' } },
    { type: 'node', id: 707, lat: 13.2827, lon: 80.2707, tags: { amenity: 'hospital', name: 'Way Outside Radius' } },
  ],
}

/** Installed before app code. Controlled at runtime by localStorage flags so cases can be switched. */
const STUB = `
(() => {
  const OVERPASS = /overpass/i;
  const realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    let u = '';
    try { u = typeof input === 'string' ? input : (input && input.url) || ''; } catch (e) { u = ''; }
    if (OVERPASS.test(u)) {
      let mode = null;
      try { mode = localStorage.getItem('qa.overpass'); } catch (e) {}
      if (mode === 'ok') {
        window.__qaOverpassCalls = (window.__qaOverpassCalls || 0) + 1;
        return Promise.resolve(new Response(JSON.stringify(${JSON.stringify(FIXTURE)}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      if (mode === '504') {
        window.__qaOverpassCalls = (window.__qaOverpassCalls || 0) + 1;
        return Promise.resolve(new Response('gateway timeout', { status: 504 }));
      }
    }
    return realFetch(input, init);
  };
})();
`

const proc = spawn(
  chrome,
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=360,740', 'about:blank'],
  { stdio: 'ignore' },
)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForDevtools() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) return
    } catch {}
    await sleep(200)
  }
  throw new Error('devtools never came up')
}

async function main() {
  await waitForDevtools()
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  const page = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))

  let id = 0
  const pending = new Map()
  const exceptions = []
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    } else if (msg.method === 'Runtime.exceptionThrown') {
      exceptions.push(msg.params?.exceptionDetails?.text ?? 'exception')
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
    if (r.result?.exceptionDetails) return { __error: r.result.exceptionDetails.text }
    return r.result?.result?.value
  }
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' })
    if (r.result?.data) writeFileSync(join(shotDir, name), Buffer.from(r.result.data, 'base64'))
  }
  const goto = async (hash) => {
    // A unique query string forces a real document load; navigating to the same hash would not.
    await send('Page.navigate', { url: `${url}?t=${Date.now()}${hash}` })
    for (let i = 0; i < 40; i++) {
      if (await evaluate(`!!document.querySelector('h1, .btn-hero')`)) break
      await sleep(100)
    }
    await sleep(250)
  }
  const permission = (setting) => send('Browser.setPermission', { origin, permission: { name: 'geolocation' }, setting })
  const setOffline = (offline) =>
    send('Network.emulateNetworkConditions', { offline, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: STUB })

  const log = []
  const clearStorage = () => evaluate(`(() => { localStorage.clear(); return true })()`)

  // Tap the button and wait for the outcome we expect. expect: 'list' | 'note'
  const tapFind = async (labelRe, expect) => {
    const clicked = await evaluate(`(() => {
      const re = new RegExp(${'`'}${labelRe}${'`'});
      const b = [...document.querySelectorAll('.nearby button')].find(x => re.test(x.textContent));
      if (b) b.click();
      return !!b;
    })()`)
    if (clicked !== true) return { ms: -1, clicked: false }
    const t0 = Date.now()
    for (let i = 0; i < 150; i++) {
      const done = await evaluate(`(() => {
        const n = document.querySelector('.nearby');
        if (!n) return false;
        return ${expect === 'list' ? "!!n.querySelector('.nearby-list')" : "/Use the list for your state below/.test(n.textContent)"};
      })()`)
      if (done === true) return { ms: Date.now() - t0, clicked: true }
      await sleep(100)
    }
    return { ms: Date.now() - t0, clicked: true, timedOut: true }
  }

  const nearbyState = () =>
    evaluate(`(() => {
      const n = document.querySelector('.nearby');
      const cards = [...document.querySelectorAll('.nearby-list .hosp')];
      return {
        cards: cards.length,
        names: cards.map(c => c.querySelector('b')?.textContent),
        distances: cards.map(c => c.querySelector('.small')?.textContent),
        actions: cards.map(c => { const a = c.querySelector('a'); return a ? (a.getAttribute('href') || '').slice(0, 42) : null }),
        deadEnds: cards.filter(c => !c.querySelector('a')).length,
        note: (n?.textContent.match(/(Location is off[^]*?112|Could not get your location[^]*?112|No internet[^]*?112)/) || [])[0]?.slice(0, 90) || null,
        stateListStillThere: !!document.querySelector('select.sel'),
        overpassCalls: window.__qaOverpassCalls || 0,
      };
    })()`)

  const wipe = () => evaluate(`(() => { const c = localStorage.getItem('qa.cloud'); localStorage.clear(); if (c) localStorage.setItem('qa.cloud', c); return true })()`)

  // ---------------------------------------------------------------- A. permission granted
  await goto('#/now/help')
  await wipe()
  await permission('granted')
  await send('Emulation.setGeolocationOverride', { latitude: CHENNAI.lat, longitude: CHENNAI.lng, accuracy: 40 })
  await evaluate(`localStorage.setItem('qa.overpass', 'ok')`)
  await goto('#/now/help')
  const a = await tapFind('Find nearest hospital', 'list')
  log.push(['A granted', a, await nearbyState()])
  log.push([
    'A cached to localStorage',
    await evaluate(`(() => {
      const g = JSON.parse(localStorage.getItem('fs.geo') || 'null');
      const n = JSON.parse(localStorage.getItem('fs.nearby') || 'null');
      return { geo: g && { lat: g.lat, lng: g.lng, hasAt: typeof g.at === 'number' }, nearbyItems: n?.items?.length ?? 0 };
    })()`),
  ])
  await shot('20-nearby-granted.png')

  // ---------------------------------------------------------------- B. cached fix means no prompt
  // Keep fs.geo, drop the cached results, and deny permission. If the saved fix is used, this
  // still succeeds; if the app re-prompted, the denial would fail it.
  await evaluate(`localStorage.removeItem('fs.nearby')`)
  await permission('denied')
  await goto('#/now/help')
  const b = await tapFind('Find nearest hospital', 'list')
  log.push(['B cached position, permission denied', b, { cards: (await nearbyState()).cards }])

  // ---------------------------------------------------------------- C. denied, nothing cached
  await goto('#/now/help')
  await wipe()
  await evaluate(`localStorage.setItem('qa.overpass', 'ok')`)
  await goto('#/now/help')
  const c = await tapFind('Find nearest hospital', 'note')
  const stateC = await nearbyState()
  log.push(['C denied cold', c, { note: stateC.note, cards: stateC.cards, stateList: stateC.stateListStillThere }])
  await shot('21-nearby-denied.png')

  // ---------------------------------------------------------------- D. offline (real network off)
  await goto('#/now/help')
  await wipe()
  await permission('granted')
  await goto('#/now/help')
  await setOffline(true)
  const d = await tapFind('Find nearest hospital', 'note')
  const stateD = await nearbyState()
  log.push(['D offline', d, { note: stateD.note, cards: stateD.cards, stateList: stateD.stateListStillThere }])
  await shot('22-nearby-offline.png')
  await setOffline(false)

  // ---------------------------------------------------------------- E. both Overpass endpoints 504
  await goto('#/now/help')
  await wipe()
  await evaluate(`localStorage.setItem('qa.overpass', '504')`)
  await goto('#/now/help')
  const e = await tapFind('Find nearest hospital', 'note')
  const stateE = await nearbyState()
  log.push(['E overpass 504 x2', e, { note: stateE.note, endpointsTried: stateE.overpassCalls, stateList: stateE.stateListStillThere }])

  // Emergency contacts and the confirm popup are covered by scripts/qa_contacts.mjs

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
