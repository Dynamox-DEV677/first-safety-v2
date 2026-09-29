/**
 * v2 QA: the entry screen (§4) and mammal content behind the verify gate (§5), driven in headless
 * Chrome over the DevTools protocol. Fresh profile, 360/390/414, light and dark.
 * Usage: node scripts/qa_v2.mjs [url] [chromePath] [screenshotDir]
 * Requires the production build to be served (npx vite preview --port 4180 --strictPort).
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = (process.argv[2] ?? 'http://localhost:4180/').replace(/\/?$/, '/')
const chrome = process.argv[3] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const shotDir = process.argv[4] ?? join(process.cwd(), 'qa-shots')
const port = 9336
const profile = mkdtempSync(join(tmpdir(), 'fs-qa2-'))
mkdirSync(shotDir, { recursive: true })

const proc = spawn(
  chrome,
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=360,740', 'about:blank'],
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

const HELPERS = String.raw`
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = [];
const txt = (sel) => document.querySelector(sel)?.textContent?.trim();
const go = async (h) => { location.hash = h; await sleep(150); };
const clickText = (re) => { const b = [...document.querySelectorAll('button, a')].find(x => re.test(x.textContent.trim())); if (!b) throw new Error('no control matching ' + re); b.click(); };
const ls = (k) => JSON.parse(localStorage.getItem(k));
const setLS = (k, v) => { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); window.dispatchEvent(new CustomEvent('fs:storage', { detail: k })); };
const visible = (e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';
const TAPS = 'button, a.btn, a.tel, a.topic, .bnav a, summary, .hdr-link, .wordmark, select, input, .entry-btn';
const short = (min = 64) => [...document.querySelectorAll(TAPS)].filter(visible).map(e => ({ t: (e.textContent || e.id || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 28), h: Math.round(e.getBoundingClientRect().height) })).filter(x => x.h < min);
const heights = (sel) => [...document.querySelectorAll(sel)].map(e => ({ t: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 30), h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width) }));
const hscroll = () => document.documentElement.scrollWidth > window.innerWidth;
const fonts = () => ({ body: getComputedStyle(document.body).fontFamily.split(',')[0], brand: document.querySelector('.entry-brand') ? getComputedStyle(document.querySelector('.entry-brand')).fontFamily.split(',')[0] : null, faces: [...document.fonts].map(f => f.family + ' ' + f.weight + ':' + f.status) });
const gate = () => [...document.querySelectorAll('.gate')].map(g => ({ title: g.querySelector('h2')?.textContent, lines: g.querySelectorAll('.srcd').length, cites: [...g.querySelectorAll('.srcd-cite a')].every(a => /^https:\/\//.test(a.href)), held: [...g.querySelectorAll('.gate-msg')].map(m => m.textContent) }));
const hasContinue = () => !![...document.querySelectorAll('a.btn')].find(a => /^Continue first aid/.test(a.textContent.trim()));
`

const FLOW = String.raw`(async () => {
${HELPERS}
// ---- §4 entry screen on a fresh phone ----
await go('#/'); await sleep(300);
log.push(['E1 entry', location.hash, 'brand', txt('.entry-brand'), 'h1', txt('h1'), 'note', txt('.entry-note'), 'continue', hasContinue(), 'learn button gone', !document.body.innerText.includes('Learn about rabies')]);
log.push(['E2 entry buttons', heights('.entry-btn'), 'sub-64 targets', short(), 'hscroll', hscroll(), 'page fits', document.documentElement.scrollHeight <= window.innerHeight + 1, 'innerH', window.innerHeight]);
log.push(['E3 fonts', fonts()]);
log.push(['E4 header', getComputedStyle(document.querySelector('.hdr')).position, getComputedStyle(document.querySelector('.hdr')).top, 'red token', getComputedStyle(document.documentElement).getPropertyValue('--red').trim(), 'ink', getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()]);
// red: starts the 15 minutes at once and lands on the wash step
const t0 = Date.now();
document.querySelector('.entry-btn.red').click(); await sleep(400);
const tm = ls('fs.timer'); const b1 = ls('fs.biteRecord');
log.push(['E5 red button', location.hash, 'timer started within 2s', !!tm && Math.abs(tm.startedAt - t0) < 2000, 'digits', txt('.timer-digits'), 'biteAt set', !!b1?.biteAt, 'washStartedAt set', !!b1?.washStartedAt, 'animal', b1?.animal, 'completedAt', b1?.completedAt]);
log.push(['E6 step1 taps', 'sub-64', short(), 'hscroll', hscroll(), 'digits font', getComputedStyle(document.querySelector('.timer-digits')).fontFamily.split(',')[0]]);
// home again: recent, unfinished -> Continue offered
await go('#/'); await sleep(200);
log.push(['E7 continue after red', hasContinue(), [...document.querySelectorAll('a.btn')].map(a => a.textContent.trim()).find(t => /^Continue/.test(t))]);
// grey: a new incident, timer cleared, animal picker
document.querySelector('.entry-btn.grey').click(); await sleep(300);
const b2 = ls('fs.biteRecord');
log.push(['E8 grey button', location.hash, 'timer cleared', ls('fs.timer') === null, 'fresh record', !!b2?.biteAt && b2.biteAt !== b1.biteAt && b2.animal === 'unknown', 'h1', txt('h1')]);
// ---- §5 animal picker ----
log.push(['A1 picker', heights('.grid2 .btn').map(x => x.t + ' ' + x.h), 'sub-64', short(), 'hscroll', hscroll(), 'skip', [...document.querySelectorAll('.actions button')].map(a => a.textContent.trim())]);
clickText(/^Skip - start washing now$/); await sleep(300);
log.push(['A1b skip starts the timer', location.hash, 'timer running', !!ls('fs.timer'), 'digits', txt('.timer-digits')]);
setLS('fs.timer', null); await go('#/now/animal'); await sleep(200);
clickText(/^Snake, insect or spider$/); await sleep(150);
log.push(['A2 not a mammal', txt('.notice p'), 'tel', [...document.querySelectorAll('.notice a[href^="tel:"]')].map(a => a.getAttribute('href')), 'still on picker', location.hash]);
clickText(/^Snake, insect or spider$/); await sleep(100);
log.push(['A3 notice closes', !document.querySelector('.notice')]);
clickText(/^Bat$/); await sleep(300);
log.push(['A4 bat', location.hash, 'recorded', ls('fs.biteRecord')?.animal, 'question', [...document.querySelectorAll('.eyebrow')].map(e => e.textContent.trim()).find(t => /know/.test(t)), 'options', [...document.querySelectorAll('[data-q=known] .btn')].map(b => b.textContent.trim().replace(/\s+/g, ' '))]);
await go('#/now/step/6'); await sleep(300);
log.push(['A5 step 6 bat notes', gate(), 'about label', document.body.innerText.includes('About the dog') ? 'STILL SAYS DOG' : 'ok']);
await go('#/now/help'); await sleep(400);
log.push(['A6 help bat', gate(), 'sub-64', short(), 'hscroll', hscroll()]);
// the gate: livestock and human each carry one unverified string
const tryAnimal = async (re, id) => { await go('#/now/animal'); await sleep(150); clickText(re); await sleep(250); await go('#/now/help'); await sleep(350); return { id, recorded: ls('fs.biteRecord')?.animal, gates: gate() }; };
log.push(['A7 gate livestock', await tryAnimal(/^Cow/, 'livestock')]);
log.push(['A8 gate human', await tryAnimal(/^Person$/, 'human')]);
log.push(['A9 gate dog', await tryAnimal(/^Dog$/, 'dog')]);
log.push(['A10 gate other', await tryAnimal(/^Another animal/, 'other')]);
// ---- §4 fresh-load rules ----
const rec = ls('fs.biteRecord');
setLS('fs.timer', null); setLS('fs.nowStep', 3); setLS('fs.biteRecord', { ...rec, biteAt: new Date(Date.now() - 5 * 60000).toISOString(), completedAt: '' });
await go('#/'); await sleep(250);
log.push(['F1 recent + step 3 -> continue', hasContinue()]);
setLS('fs.biteRecord', { ...rec, biteAt: new Date(Date.now() - 31 * 60000).toISOString(), completedAt: '' }); await sleep(250);
log.push(['F2 31 min old -> no continue', !hasContinue()]);
setLS('fs.biteRecord', { ...rec, biteAt: new Date(Date.now() - 5 * 60000).toISOString(), completedAt: '' }); setLS('fs.nowStep', 6);
await go('#/now/go'); await sleep(300);
const done = ls('fs.biteRecord');
log.push(['F3 final screen marks complete', !!done?.completedAt, 'copy', txt('.final-sub')]);
await go('#/'); await sleep(250);
log.push(['F4 complete -> no continue', !hasContinue()]);
// ---- §4 "New incident" on the handover report ----
setLS('fs.medical', { name: 'Keep Me', contacts: [] });
await go('#/report'); await sleep(300);
const ni = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'New incident');
log.push(['N1 report', 'new incident button', !!ni, 'h', ni && Math.round(ni.getBoundingClientRect().height), 'report font', getComputedStyle(document.querySelector('.report')).fontFamily.split(',')[0], 'animal row', [...document.querySelectorAll('.rrow')].map(r => r.innerText.replace(/\n/g, ' | ')).find(t => /^Animal/.test(t))]);
window.confirm = () => false; ni.click(); await sleep(200);
log.push(['N2 cancel keeps record', !!ls('fs.biteRecord'), location.hash]);
window.confirm = () => true; ni.click(); await sleep(300);
log.push(['N3 confirm clears', location.hash, 'bite', ls('fs.biteRecord'), 'timer', ls('fs.timer'), 'nowStep', ls('fs.nowStep'), 'triage', ls('fs.triage'), 'medical kept', ls('fs.medical')?.name, 'continue', hasContinue()]);
return log;
})()`

async function main() {
  await waitForDevtools()
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  const page = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map()
  let exceptions = 0
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
  const size = (w) => send('Emulation.setDeviceMetricsOverride', { width: w, height: 740, deviceScaleFactor: 2, mobile: true })
  const dark = (on) => send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: on ? 'dark' : 'light' }] })
  const openAndShot = async (hash, name) => {
    await send('Page.navigate', { url: url + '?t=' + Date.now() + hash })
    for (let i = 0; i < 50; i++) {
      if (await evaluate(`!!document.querySelector('h1')`)) break
      await sleep(100)
    }
    await sleep(400)
    await shot(name)
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await size(360)
  await send('Page.navigate', { url })
  await sleep(1200)

  const log = await evaluate(FLOW)
  for (const row of Array.isArray(log) ? log : [log]) console.log(JSON.stringify(row))

  // Screens: entry at three widths, dark, picker, gate, step 6 with notes.
  for (const w of [360, 390, 414]) {
    await size(w)
    await send('Page.navigate', { url: url + '?t=' + Date.now() + '#/' })
    await sleep(600)
    const check = await evaluate(`(() => { const b = [...document.querySelectorAll('.entry-btn')].map(e => Math.round(e.getBoundingClientRect().height)); return { w: window.innerWidth, hscroll: document.documentElement.scrollWidth > window.innerWidth, entry: b, fits: document.documentElement.scrollHeight <= window.innerHeight + 1 }; })()`)
    console.log(JSON.stringify(['W entry @' + w, check]))
    await shot(`v2-entry-${w}.png`)
  }
  await size(360)
  await dark(true)
  await openAndShot('#/', 'v2-entry-360-dark.png')
  const darkCheck = await evaluate(`(() => { const cs = getComputedStyle(document.documentElement); return { paper: cs.getPropertyValue('--paper').trim(), red: cs.getPropertyValue('--red').trim(), bodyBg: getComputedStyle(document.body).backgroundColor, redBtnColor: getComputedStyle(document.querySelector('.entry-btn.red')).color }; })()`)
  console.log(JSON.stringify(['D dark tokens', darkCheck]))
  await dark(false)
  // Manual dark theme (Settings > Dark): the token block behind [data-theme="dark"].
  await evaluate(`localStorage.setItem('fs.theme', JSON.stringify('dark'))`)
  await openAndShot('#/', 'v2-entry-360-theme-dark.png')
  const themeDark = await evaluate(`(() => { const cs = getComputedStyle(document.documentElement); const red = document.querySelector('.entry-btn.red'); return { theme: document.documentElement.dataset.theme, paper: cs.getPropertyValue('--paper').trim(), red: cs.getPropertyValue('--red').trim(), bodyBg: getComputedStyle(document.body).backgroundColor, redBtn: red && getComputedStyle(red).backgroundColor + ' / ' + getComputedStyle(red).color, hdrBg: getComputedStyle(document.querySelector('.hdr')).backgroundColor }; })()`)
  console.log(JSON.stringify(['D2 theme dark', themeDark]))
  await openAndShot('#/report', 'v2-report-360-theme-dark.png')
  const reportDark = await evaluate(`(() => { const r = document.querySelector('.report'); return { bg: getComputedStyle(r).backgroundColor, color: getComputedStyle(r).color, title: getComputedStyle(document.querySelector('.rtitle')).color }; })()`)
  console.log(JSON.stringify(['D3 report stays white in dark', reportDark]))
  await evaluate(`localStorage.removeItem('fs.theme')`)
  await openAndShot('#/now/animal', 'v2-animals-360.png')
  await evaluate(`(async () => { const b = [...document.querySelectorAll('button')].find(x => /^Cow/.test(x.textContent.trim())); b.click(); await new Promise(r => setTimeout(r, 200)); })()`)
  await openAndShot('#/now/help', 'v2-help-gate-360.png')
  await evaluate(`(async () => { const g = document.querySelector('.gate'); g && g.scrollIntoView(); await new Promise(r => setTimeout(r, 200)); })()`)
  await shot('v2-help-gate-360-scrolled.png')
  await openAndShot('#/now/step/6', 'v2-step6-360.png')
  await openAndShot('#/report', 'v2-report-360.png')

  const sw = await evaluate(`(async () => { try { const r = await navigator.serviceWorker.getRegistration(); const keys = await caches.keys(); let fonts = 0; for (const k of keys) { const c = await caches.open(k); const reqs = await c.keys(); fonts += reqs.filter(q => /\\.woff2/.test(q.url)).length; } return { registered: !!r, caches: keys.length, cachedFonts: fonts }; } catch (e) { return { error: e.message }; } })()`)
  console.log(JSON.stringify(['SW', sw]))

  console.log(`page exceptions: ${exceptions}`)
  console.log(`screenshots in ${shotDir}`)
  ws.close()
  proc.kill()
}

main().catch((e) => {
  console.error(e)
  proc.kill()
  process.exit(1)
})
