/**
 * v2 QA in headless Chrome over the DevTools protocol, on the production build, from a clean
 * profile: entry screen (§4), mammal content and the verify gate (§5), the site question (§6), the
 * facts screen and handover record (§7), typed input and the no-model path (§9), and the §12 checks
 * that a browser can prove - contrast, tap sizes, widths, one clock, network, offline.
 * Usage: node scripts/qa_v2.mjs [url] [chromePath] [screenshotDir]
 * Requires: npx vite preview --port 4180 --strictPort
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
const log = []; window.__qaLog = log;
const txt = (sel) => document.querySelector(sel)?.textContent?.trim();
const go = async (h) => { location.hash = h; await sleep(200); };
const btn = (re) => [...document.querySelectorAll('button, a')].find(x => re.test(x.textContent.trim().replace(/\s+/g, ' ')));
const clickText = (re) => { const b = btn(re); if (!b) throw new Error('no control matching ' + re + ' on ' + location.hash); b.click(); };
const ls = (k) => JSON.parse(localStorage.getItem(k));
const setLS = (k, v) => { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); window.dispatchEvent(new CustomEvent('fs:storage', { detail: k })); };
const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
const TAPS = 'button, a.btn, a.tel, a.topic, .bnav a, summary, .hdr-link, .wordmark, select, input:not([type=hidden]), .entry-btn';
const short = (min = 64) => [...document.querySelectorAll(TAPS)].filter(visible).map(e => ({ t: (e.textContent || e.id || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 28), h: Math.round(e.getBoundingClientRect().height) })).filter(x => x.h < min);
const hscroll = () => document.documentElement.scrollWidth > window.innerWidth;
const fits = () => document.documentElement.scrollHeight <= window.innerHeight + 1;
const gates = () => [...document.querySelectorAll('.gate')].map(g => ({ title: g.querySelector('h2')?.textContent || '', lines: g.querySelectorAll('.srcd').length, cites: [...g.querySelectorAll('.srcd-cite a')].every(a => /^https:\/\//.test(a.href)), held: g.querySelectorAll('.gate-msg').length }));
const recRows = () => Object.fromEntries([...document.querySelectorAll('.rec-row')].map(r => [r.querySelector('.rec-label').textContent.trim(), r.querySelector('.rec-value').textContent.trim()]));
const recLists = () => Object.fromEntries([...document.querySelectorAll('.rec-sec')].filter(s => s.querySelector('.rec-list') || (!s.querySelector('.rec-rows') && s.querySelector('h2'))).map(s => [s.querySelector('h2').textContent.trim(), [...s.querySelectorAll('.rec-list li')].map(li => li.textContent.trim())]));
const clocks = () => [...document.querySelectorAll('.timer-digits, .minibar-time')].filter(visible).length;
// WCAG contrast of every visible element that has its own text, against its effective background.
const contrast = (skip) => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0,0,0,0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = ([r,g,b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b); };
  const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c[3] > 0) { stack.push(c); if (c[3] >= 1) break; } } let out = [255,255,255]; const base = parse(getComputedStyle(document.body).backgroundColor); if (base[3] > 0) out = base.slice(0,3); for (let i = stack.length - 1; i >= 0; i--) { const [r,g,b,a] = stack[i]; out = [r*a + out[0]*(1-a), g*a + out[1]*(1-a), b*a + out[2]*(1-a)]; } return out; };
  const fails = []; let min = 99, n = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || (skip && el.closest(skip))) continue;
    if (![...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) continue;
    if (el.closest('[disabled], [aria-hidden=true]')) continue;
    const fg = parse(getComputedStyle(el).color); const bg = bgOf(el);
    const a = fg[3]; const f = [fg[0]*a + bg[0]*(1-a), fg[1]*a + bg[1]*(1-a), fg[2]*a + bg[2]*(1-a)];
    const L1 = lum(f), L2 = lum(bg); const ratio = (Math.max(L1,L2) + 0.05) / (Math.min(L1,L2) + 0.05);
    n++; if (ratio < min) min = ratio;
    if (ratio < 7) fails.push({ t: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), r: Math.round(ratio * 100) / 100 });
  }
  return { n, min: Math.round(min * 100) / 100, fails: fails.slice(0, 8), failCount: fails.length };
};
`

const FLOW = String.raw`(async () => {
${HELPERS}
try {
// ---- §4 entry on a fresh phone ----
await go('#/'); await sleep(300);
log.push(['E1 entry', txt('.entry-brand'), txt('h1'), 'entry buttons', [...document.querySelectorAll('.entry-btn')].map(b => Math.round(b.getBoundingClientRect().height)), 'fits', fits(), 'clinic link (no incident)', !!document.querySelector('.clinic-link')]);
// red path
document.querySelector('.entry-btn.red').click(); await sleep(400);
log.push(['E2 red', location.hash, 'timer', !!ls('fs.timer'), 'startedVia', ls('fs.biteRecord')?.startedVia, 'clinic link', !!document.querySelector('.clinic-link'), 'clocks on step 1', clocks()]);
await go('#/now/details'); await sleep(300);
log.push(['E3 one clock in the header while away from the timer', clocks(), !!document.querySelector('.minibar-time')]);
setLS('fs.timer', null);

// ---- §9 grey path, typed words (no speech model on this phone) ----
await go('#/'); await sleep(200);
document.querySelector('.entry-btn.grey').click(); await sleep(400);
log.push(['T1 picker', location.hash, 'startedVia', ls('fs.biteRecord')?.startedVia, 'voice state', document.querySelector('[data-voice]')?.dataset.voice, 'no-model line', txt('.voice-note') || '(none)']);
const typeIt = async (words) => { let i = null; for (let k = 0; k < 40 && !i; k++) { i = document.querySelector('#what-happened'); if (!i) await sleep(100); } if (!i) throw new Error('no type box on ' + location.hash + ' voice=' + document.querySelector('[data-voice]')?.dataset.voice); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, words); i.dispatchEvent(new Event('input', { bubbles: true })); await sleep(80); document.querySelector('.type-box button[type=submit]').click(); await sleep(300); for (let k = 0; k < 60 && document.querySelector('[data-voice=working]'); k++) await sleep(100); await sleep(150); };
await typeIt('street kutta bit my leg, khoon aa raha hai');
log.push(['T2 typed', 'heard', txt('.voice-heard'), 'chips', [...document.querySelectorAll('.chip')].map(c => c.textContent), 'record', (({animal, site, contact, bleeding}) => ({animal, site, contact, bleeding}))(ls('fs.biteRecord'))]);
clickText(/^Looks right$/); await sleep(300);
log.push(['T3 site known -> facts screen', location.hash]);
await go('#/now/animal'); await sleep(300);
await typeIt('a cat or a rat, not sure');
log.push(['T4 ambiguous', 'narrowed taps', [...document.querySelectorAll('[data-voice=candidates] .btn')].map(b => b.textContent), 'or online pick', [...document.querySelectorAll('.chip')].map(c => c.textContent), 'prompt', txt('[data-voice=done] .body') || (btn(/^Looks right$/) ? 'Looks right' : '')]);
clickText(/^Try again$/); await sleep(200);
await typeIt('we reached the hospital');
await sleep(300);
log.push(['T5 "we reached the hospital" -> record', location.hash]);

// ---- §6 the site question ----
await go('#/now/area'); await sleep(300);
log.push(['S1 area', txt('h1'), 'buttons', [...document.querySelectorAll('.sites .btn')].map(b => b.textContent.trim() + ' ' + Math.round(b.getBoundingClientRect().height)), 'fits 360x740', fits(), 'sub-64', short(), 'hscroll', hscroll()]);
clickText(/^Hands or fingers$/); await sleep(300);
log.push(['S2 tap -> facts', location.hash, 'site', ls('fs.biteRecord')?.site, 'site lines', gates()]);

// ---- §7 facts screen ----
const tap = async (re) => { clickText(re); await sleep(120); };
await tap(/^About 30 min ago$/);
log.push(['D1 30 min ago -> late line', gates().map(g => g.title + ':' + g.lines), 'biteAt minus openedAt (min)', Math.round((Date.parse(ls('fs.biteRecord').openedAt) - Date.parse(ls('fs.biteRecord').biteAt)) / 60000)]);
await tap(/^Saliva in eyes, nose or mouth$/);
const g2 = gates().length;
await tap(/^Turmeric$/);
log.push(['D2 saliva + turmeric -> their sourced lines', 'gates', g2, '->', gates().length, 'texts', [...document.querySelectorAll('.srcd-text')].map(t => t.textContent.slice(0, 40))]);
await tap(/^Nothing$/);
log.push(['D3 "Nothing" clears substances', ls('fs.biteRecord').substances]);
await tap(/^Turmeric$/); await tap(/^Bit$/);
document.querySelector('[data-q=broke] .btn').click(); await sleep(80);
document.querySelector('[data-q=bleeding] .btn').click(); await sleep(80);
await tap(/^Left open$/);
document.querySelector('[data-q=known] .btn').click(); await sleep(120);
const vq = !!document.querySelector('[data-q=animal-vaccinated]');
document.querySelectorAll('[data-q=known] .btn')[1].click(); await sleep(120);
log.push(['D4 known -> vaccinated question appears', vq, 'stray -> gone', !document.querySelector('[data-q=animal-vaccinated]'), 'fs.triage', ls('fs.triage')]);
await tap(/^Someone else/);
log.push(['D5 facts screen', 'sub-64', short(), 'hscroll', hscroll(), 'grading words on screen', /categor|risk|you will be fine/i.test(document.body.innerText), 'record', (({contact, brokeSkin, bleeding, substances, closure, animalKnown, patient}) => ({contact, brokeSkin, bleeding, substances, closure, animalKnown, patient}))(ls('fs.biteRecord'))]);

// ---- §7 the record, opened from the header ----
document.querySelector('.clinic-link').click(); await sleep(500);
const rr = recRows(); const rl = recLists();
const sizes = [...document.querySelectorAll('.rec *')].filter(e => [...e.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())).map(e => parseFloat(getComputedStyle(e).fontSize));
log.push(['R1 record', location.hash, 'title', txt('.rec-title'), 'generated', txt('.rec-gen'), 'smallest text px', Math.min(...sizes), 'font', getComputedStyle(document.querySelector('.rec')).fontFamily.split(',')[0]]);
log.push(['R2 rows', rr]);
log.push(['R3 lists', rl]);
log.push(['R4 footer', [...document.querySelectorAll('.rec-foot p')].map(p => p.textContent), 'private line', txt('.rec-private')]);
clickText(/^हिन्दी$/); await sleep(200);
log.push(['R5 Hindi', 'title', txt('.rec-title'), 'a label', document.querySelector('.rec-row .rec-label')?.textContent, 'a value', document.querySelector('.rec-row .rec-value')?.textContent, 'footer lines', document.querySelectorAll('.rec-foot p').length]);
clickText(/^English$/); await sleep(150);
clickText(/^Share$/); await sleep(300);
log.push(['R6 share (no share sheet in headless)', txt('.rec-actions [role=status]'), 'plain text shown', !!document.querySelector('.rec-plain'), 'starts', document.querySelector('.rec-plain')?.value.split('\n')[0]]);
log.push(['R7 read aloud button', !!btn(/^Read aloud$/), 'copy', !!btn(/^Copy$/), 'print', !!btn(/^Print \/ PDF$/), 'new incident', !!btn(/^New incident$/), 'add details', !!btn(/^Add or change details$/)]);

// ---- help screen: no self-grading table ----
await go('#/now/help'); await sleep(400);
log.push(['H1 help', 'category table rows', document.querySelectorAll('.cat').length, '"No vaccine needed" on screen', document.body.innerText.includes('No vaccine needed'), 'record button', !!btn(/show the record/)]);

// ---- §5 gate still holds (livestock / human carry unverified lines) ----
const tryAnimal = async (re) => { await go('#/now/animal'); await sleep(200); clickText(re); await sleep(300); await go('#/now/help'); await sleep(400); return gates(); };
log.push(['G1 livestock', await tryAnimal(/^Cow/)]);
log.push(['G2 person', await tryAnimal(/^Person$/)]);

// ---- §4 fresh-load rules ----
const rec = ls('fs.biteRecord');
const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
setLS('fs.nowStep', 3); setLS('fs.biteRecord', { ...rec, openedAt: ago(5), biteAt: ago(5), completedAt: '' });
await go('#/'); await sleep(250);
const hasContinue = () => !!btn(/^Continue first aid/);
log.push(['F1 recent unfinished -> continue', hasContinue()]);
setLS('fs.biteRecord', { ...rec, openedAt: ago(31), biteAt: ago(31), completedAt: '' }); await sleep(250);
log.push(['F2 31 min old -> fresh entry', !hasContinue(), txt('h1')]);
setLS('fs.biteRecord', { ...rec, openedAt: ago(5), biteAt: ago(5), completedAt: new Date().toISOString() }); await sleep(250);
log.push(['F3 finished -> fresh entry', !hasContinue()]);

// ---- New incident ----
await go('#/report'); await sleep(300);
window.confirm = () => true; clickText(/^New incident$/); await sleep(300);
log.push(['N1 new incident', location.hash, 'record', ls('fs.biteRecord'), 'timer', ls('fs.timer'), 'clinic link gone', !document.querySelector('.clinic-link')]);

// ---- §9 voice offer on the LEARN side; online help off by default ----
await go('#/learn'); await sleep(500);
log.push(['L1 learn offer', txt('.offer .h3'), 'download button', [...document.querySelectorAll('.offer button')].map(b => b.textContent.trim())]);
clickText(/^Not now$/); await sleep(200);
log.push(['L2 not now hides it', !document.querySelector('.offer')]);
await go('#/settings'); await sleep(300);
log.push(['O1 online help', [...document.querySelectorAll('[aria-label="Online help"] .btn')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')), 'stored', localStorage.getItem('fs.onlineMatch')]);
} catch (e) { log.push(['ERROR', String(e), location.hash, document.querySelector('[data-voice]')?.outerHTML?.slice(0, 300)]); }
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
  const requests = []
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
      requests.push({ url: msg.params.request.url, method: msg.params.request.method, body: msg.params.request.postData ?? '' })
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
  const size = (w, h = 740) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true })
  const open = async (hash) => {
    await send('Page.navigate', { url: url + '?t=' + Date.now() + hash })
    for (let i = 0; i < 60; i++) {
      if (await evaluate(`!!document.querySelector('h1')`)) break
      await sleep(100)
    }
    await sleep(400)
  }
  const print = (row) => console.log(JSON.stringify(row))

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await size(360)
  await send('Page.navigate', { url })
  await sleep(1500)

  const log = await Promise.race([
    evaluate(FLOW),
    sleep(240_000).then(async () => [...((await evaluate('window.__qaLog')) ?? []), ['TIMEOUT', await evaluate('location.hash'), await evaluate("document.querySelector('[data-voice]')?.dataset.voice ?? ''")]]),
  ])
  for (const row of Array.isArray(log) ? log : [log]) print(row)

  // ---- a realistic incident for the screenshots and the contrast pass ----
  const seed = `(() => { const ago = (m) => new Date(Date.now() - m*60000).toISOString(); localStorage.setItem('fs.biteRecord', JSON.stringify({ openedAt: ago(34), startedVia: 'wash', biteAt: ago(34), biteEstimate: '', animal: 'dog', animalKnown: 'no', animalVaccinated: '', site: 'hand', contact: ['bite'], brokeSkin: 'yes', bleeding: 'yes', substances: ['none'], substancesAt: ago(25), closure: 'open', patient: '', priorRabies: '', priorTetanus: '', washStartedAt: ago(31), washSeconds: 900, stepsCompleted: [1,2,3,4,5,6], completedAt: '' })); return true; })()`
  await evaluate(seed)

  // ---- widths ----
  for (const w of [360, 390, 414]) {
    await size(w)
    const out = {}
    for (const [name, hash] of [['entry', '#/'], ['area', '#/now/area'], ['facts', '#/now/details'], ['record', '#/report']]) {
      await open(hash)
      out[name] = await evaluate(`(() => ({ hscroll: document.documentElement.scrollWidth > window.innerWidth, fits: document.documentElement.scrollHeight <= window.innerHeight + 1 }))()`)
    }
    print(['W @' + w, out])
  }
  await size(360)
  await open('#/now/area'); await shot('v2-area6-360.png')
  await open('#/now/details'); await shot('v2-facts-360.png')
  await evaluate(`window.scrollTo(0, 900)`); await sleep(200); await shot('v2-facts-360-scrolled.png')
  await open('#/report'); await shot('v2-record-360.png')
  await evaluate(`window.scrollTo(0, 700)`); await sleep(200); await shot('v2-record-360-scrolled.png')
  await evaluate(`window.scrollTo(0, 1400)`); await sleep(200); await shot('v2-record-360-scrolled2.png')
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'हिन्दी').click()`); await sleep(300)
  await evaluate(`window.scrollTo(0, 0)`); await sleep(100); await shot('v2-record-360-hindi.png')
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'English').click()`); await sleep(200)
  await open('#/now/help'); await shot('v2-help-360.png')

  // ---- §12 contrast: every visible text element, light and dark ----
  const screens = [['entry', '#/'], ['picker', '#/now/animal'], ['area', '#/now/area'], ['facts', '#/now/details'], ['step1', '#/now/step/1'], ['step3', '#/now/step/3'], ['final', '#/now/go'], ['help', '#/now/help'], ['record', '#/report'], ['learn', '#/learn'], ['quiz', '#/learn/quiz'], ['profile', '#/profile'], ['settings', '#/settings']]
  for (const theme of ['light', 'dark']) {
    await evaluate(`localStorage.setItem('fs.theme', JSON.stringify('${theme}'))`)
    const res = {}
    let worst = []
    for (const [name, hash] of screens) {
      await open(hash)
      const c = await evaluate(`(() => { ${HELPERS.replace('const log = []; window.__qaLog = log;', '')}; return contrast('.entry-note, .entry-brand, .timer-digits, .src a, .ftr'); })()`)
      res[name] = c.failCount ? `${c.min} (${c.failCount} < 7)` : `ok, min ${c.min}`
      if (c.failCount) worst.push([name, c.fails])
    }
    print(['C ' + theme, res])
    for (const w of worst) print(['C ' + theme + ' fails', w])
  }
  await evaluate(`localStorage.setItem('fs.theme', JSON.stringify('light'))`)

  // ---- §12 nothing uploaded: every request this session went to this origin, none to /api ----
  const origin = new URL(url).origin
  const foreign = requests.filter((r) => !r.url.startsWith(origin) && !r.url.startsWith('data:') && !r.url.startsWith('blob:') && !r.url.startsWith('chrome'))
  const api = requests.filter((r) => r.url.includes('/api/'))
  const posts = requests.filter((r) => r.method !== 'GET' && !r.url.includes('/api/match'))
  // Online help is on by default: the only thing allowed out is POST /api/match with {text}, nothing else.
  const apiBodies = api.map((r) => { try { return Object.keys(JSON.parse(r.body)).join(',') } catch { return 'unparsable' } })
  print(['NET', 'requests', requests.length, 'to other hosts', foreign.map((r) => r.url).slice(0, 5), 'to /api', api.length, 'their bodies carry only', [...new Set(apiBodies)], 'api methods', [...new Set(api.map((r) => r.method))], 'other non-GET', posts.map((r) => r.method + ' ' + r.url).slice(0, 5)])

  // ---- §3 offline: network cut, every screen still complete ----
  const swReady = await evaluate(`navigator.serviceWorker.ready.then(() => true)`)
  await sleep(1000)
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  const offline = {}
  for (const [name, hash] of [['entry', '#/'], ['picker', '#/now/animal'], ['area', '#/now/area'], ['facts', '#/now/details'], ['step1', '#/now/step/1'], ['final', '#/now/go'], ['help', '#/now/help'], ['record', '#/report'], ['learn', '#/learn'], ['settings', '#/settings']]) {
    await open(hash)
    offline[name] = await evaluate(`(() => { const h = document.querySelector('h1'); const busy = [...document.querySelectorAll('[aria-busy=true], .spinner')].length; return h ? (busy ? 'SPINNER ' : '') + h.textContent.trim().slice(0, 32) : 'NO H1'; })()`)
  }
  print(['OFF sw', swReady, offline])
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })

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
