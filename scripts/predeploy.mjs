/**
 * Pre-deploy audit: PWA manifest, install metadata, cold-load timing on throttled 4G, and an
 * offline cold load of NOW mode.
 * Usage: node scripts/predeploy.mjs [url] [chromePath]
 *
 * Every measurement is a COLD first visit from a fresh browser profile, because that is what a
 * judge or a stranger with a bitten arm actually experiences. Repeat visits are served by the
 * service worker and are not the interesting case.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = (process.argv[2] ?? 'http://localhost:4180/').replace(/\/?$/, '/')
const chrome = process.argv[3] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const basePort = 9477

const PROFILES = {
  'Slow 4G': { downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8, latency: 400 },
  'Fast 4G': { downloadThroughput: (4 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8, latency: 150 },
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function session(port, fn) {
  const profile = mkdtempSync(join(tmpdir(), 'fs-pre-'))
  const proc = spawn(
    chrome,
    ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'],
    { stdio: 'ignore' },
  )
  try {
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
    const bytes = { total: 0, count: 0 }
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data)
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg)
        pending.delete(msg.id)
        return
      }
      if (msg.method === 'Network.loadingFinished') {
        bytes.total += msg.params?.encodedDataLength ?? 0
        bytes.count += 1
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
    const out = await fn({ send, evaluate, bytes })
    ws.close()
    return out
  } finally {
    proc.kill()
  }
}

const results = {}

// ---------------------------------------------------------------- manifest + install metadata
results.manifest = await session(basePort, async ({ send, evaluate }) => {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url })
  for (let i = 0; i < 50; i++) {
    if (await evaluate(`!!document.querySelector('h1, .btn-hero')`)) break
    await sleep(100)
  }
  return evaluate(`(async () => {
    const link = document.querySelector('link[rel=manifest]');
    const res = await fetch(link.href);
    const m = await res.json();
    const iconChecks = [];
    for (const ic of m.icons ?? []) {
      const r = await fetch(new URL(ic.src, location.origin).href, { method: 'HEAD' });
      iconChecks.push({ src: ic.src, sizes: ic.sizes, purpose: ic.purpose ?? '(any)', status: r.status, type: r.headers.get('content-type') });
    }
    const appleIcon = document.querySelector('link[rel=apple-touch-icon]')?.getAttribute('href');
    const appleRes = appleIcon ? await fetch(appleIcon, { method: 'HEAD' }) : null;
    return {
      contentType: res.headers.get('content-type'),
      name: m.name,
      short_name: m.short_name,
      start_url: m.start_url,
      scope: m.scope,
      display: m.display,
      theme_color: m.theme_color,
      background_color: m.background_color,
      orientation: m.orientation,
      lang: m.lang,
      icons: iconChecks,
      hasMaskable: (m.icons ?? []).some(i => (i.purpose ?? '').includes('maskable')),
      ios: {
        appleTouchIcon: appleIcon,
        appleTouchIconStatus: appleRes?.status ?? null,
        appleCapable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content,
        appleTitle: document.querySelector('meta[name="apple-mobile-web-app-title"]')?.content,
        statusBar: document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.content,
      },
      themeMeta: document.querySelector('meta[name=theme-color]')?.content,
      viewport: document.querySelector('meta[name=viewport]')?.content,
      title: document.title,
      lastTag: document.documentElement.lang,
    };
  })()`)
})

// ---------------------------------------------------------------- cold load timing per network
results.timing = {}
let p = basePort + 1
for (const [label, conditions] of Object.entries(PROFILES)) {
  results.timing[label] = await session(p++, async ({ send, evaluate, bytes }) => {
    await send('Page.enable')
    await send('Runtime.enable')
    await send('Network.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true })
    // A cheap phone is not just a slow pipe; throttle the CPU too.
    await send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await send('Network.emulateNetworkConditions', { offline: false, ...conditions })

    const t0 = Date.now()
    await send('Page.navigate', { url })
    for (let i = 0; i < 300; i++) {
      const fcp = await evaluate(`performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null`)
      if (typeof fcp === 'number') break
      await sleep(100)
    }
    // let the hero button actually be there before we call it usable
    for (let i = 0; i < 300; i++) {
      if (await evaluate(`!!document.querySelector('.btn-hero')`)) break
      await sleep(100)
    }
    const wall = Date.now() - t0
    await sleep(500)

    const marks = await evaluate(`(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const paints = {};
      for (const e of performance.getEntriesByType('paint')) paints[e.name] = Math.round(e.startTime);
      return {
        firstPaint: paints['first-paint'] ?? null,
        firstContentfulPaint: paints['first-contentful-paint'] ?? null,
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
        loadEvent: nav ? Math.round(nav.loadEventEnd) : null,
        heroVisible: !!document.querySelector('.btn-hero'),
      };
    })()`)
    return { ...marks, wallMsToHeroButton: wall, transferBytes: bytes.total, requests: bytes.count }
  })
}

// ---------------------------------------------------------------- offline cold load of NOW mode
results.offline = await session(p++, async ({ send, evaluate }) => {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Page.navigate', { url })
  for (let i = 0; i < 50; i++) {
    if (await evaluate(`!!document.querySelector('.btn-hero')`)) break
    await sleep(100)
  }
  const reg = await evaluate(`(async () => {
    const r = await navigator.serviceWorker.ready;
    await new Promise(res => setTimeout(res, 2500));
    const keys = await caches.keys();
    let n = 0;
    for (const k of keys) n += (await (await caches.open(k)).keys()).length;
    return { scope: r.scope, state: r.active?.state, cachedEntries: n };
  })()`)

  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })

  const screens = {}
  for (const [name, hash] of [
    ['home', '#/'],
    ['triage', '#/now/triage'],
    ['step1 timer', '#/now/step/1'],
    ['step6', '#/now/step/6'],
    ['final', '#/now/go'],
    ['help', '#/now/help'],
    ['report', '#/report'],
    ['learn', '#/learn'],
    ['quiz', '#/learn/quiz'],
  ]) {
    await send('Page.navigate', { url: `${url}?o=${Date.now()}${hash}` })
    let heading = ''
    for (let i = 0; i < 60; i++) {
      heading = (await evaluate(`document.querySelector('h1')?.textContent ?? ''`)) || ''
      if (heading) break
      await sleep(100)
    }
    screens[name] = heading.slice(0, 46) || 'BLANK'
  }
  return { ...reg, screens, onLine: await evaluate(`navigator.onLine`) }
})

console.log(JSON.stringify(results, null, 1))
