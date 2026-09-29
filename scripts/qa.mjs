/**
 * End-to-end QA in headless Chrome over the DevTools protocol.
 * Starts from a fresh profile (no localStorage), drives every screen through the DOM, prints a log,
 * and saves screenshots. Usage: node scripts/qa.mjs [url] [chromePath] [screenshotDir]
 * Requires the production build to be served (npm run preview).
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = (process.argv[2] ?? 'http://localhost:4173/').replace(/\/?$/, '/')
const chrome = process.argv[3] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const shotDir = process.argv[4] ?? join(process.cwd(), 'qa-shots')
const port = 9334
const profile = mkdtempSync(join(tmpdir(), 'fs-qa-'))
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
const setVal = (el, v) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};
const go = async (h) => { location.hash = h; await sleep(120); };
const clickText = (re) => { const b = [...document.querySelectorAll('button, a')].find(x => re.test(x.textContent.trim())); if (!b) throw new Error('no control matching ' + re); b.click(); };
const rows = () => [...document.querySelectorAll('.rrow')].map(r => r.innerText.replace(/\n/g, ' | '));
`

// Part A: fresh phone -> red button -> report. The doctor-handoff feature and the two bug fixes.
const FLOW_A = String.raw`(async () => {
${HELPERS}
await go('#/report');
log.push(['A1 empty report renders', txt('.rtitle'), 'sub', txt('.rsub'), 'not-recorded rows', document.querySelectorAll('.rv.nr').length, 'blank lines', document.querySelectorAll('.blank').length, 'fill-by-hand', document.body.innerText.includes('Fill in by hand'), 'no chrome', !document.querySelector('.bnav') && !document.querySelector('.hdr'), 'tel links', [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href'))]);
await go('#/'); document.querySelector('.btn-hero').click(); await sleep(150);
const b1 = JSON.parse(localStorage.getItem('fs.biteRecord'));
log.push(['A2 red button', location.hash, 'biteAt set', !!b1?.biteAt, 'h1', txt('h1')]);
document.querySelectorAll('.grid2 .btn')[0].click(); await sleep(40);
document.querySelectorAll('.seg[data-q=broke] .btn')[0].click(); await sleep(40);
document.querySelectorAll('.seg[data-q=known] .btn')[1].click(); await sleep(40);
const b2 = JSON.parse(localStorage.getItem('fs.biteRecord'));
log.push(['A3 triage recorded', b2.bodyPart, b2.brokeSkin, b2.animalKnown, 'fs.triage', localStorage.getItem('fs.triage')]);
clickText(/^Start washing now$/); await sleep(150);
log.push(['A4 one tap to timer', location.hash, !!document.querySelector('.timer-digits'), 'prep hidden before start', !document.querySelector('.prep')]);
clickText(/Start the 15-minute timer/); await sleep(150);
const tm = JSON.parse(localStorage.getItem('fs.timer')); tm.startedAt = Date.now() - 5 * 60 * 1000; localStorage.setItem('fs.timer', JSON.stringify(tm)); window.dispatchEvent(new CustomEvent('fs:storage', { detail: 'fs.timer' })); await sleep(350);
log.push(['A5 timer', txt('.timer-digits'), 'washStartedAt recorded', !!JSON.parse(localStorage.getItem('fs.biteRecord')).washStartedAt]);
// prep panel: reveal by remaining time (10:00 left -> 1 block; 8:00 -> 2; 5:00 -> 3 with tel + report link; 2:00 -> 4)
const setRemaining = async (min) => { const s = JSON.parse(localStorage.getItem('fs.timer')); s.startedAt = Date.now() - (15 - min) * 60 * 1000; localStorage.setItem('fs.timer', JSON.stringify(s)); window.dispatchEvent(new CustomEvent('fs:storage', { detail: 'fs.timer' })); await sleep(350); };
const prep = () => ({ n: document.querySelectorAll('.prep-block').length, titles: [...document.querySelectorAll('.prep h2')].map(h => h.textContent), tel: [...document.querySelectorAll('.prep a[href^="tel:"]')].map(a => a.getAttribute('href')), report: !![...document.querySelectorAll('.prep a.btn')].find(a => a.getAttribute('href') === '#/report') });
log.push(['A5b prep at 10:00', prep()]);
await setRemaining(8); log.push(['A5c prep at 8:00', prep().n]);
await setRemaining(5); log.push(['A5d prep at 5:00', prep()]);
await setRemaining(2); log.push(['A5e prep at 2:00', prep().n, 'timer digits px', parseFloat(getComputedStyle(document.querySelector('.timer-digits')).fontSize), 'largest prep px', Math.max(...[...document.querySelectorAll('.prep *')].map(e => parseFloat(getComputedStyle(e).fontSize)))]);
await setRemaining(5);
await go('#/now/step/2');
log.push(['A6 banner on /now', !!document.querySelector('.minibar'), 'dismiss control', !!document.querySelector('.minibar-x')]);
await go('#/learn'); log.push(['A7 banner off /learn', !document.querySelector('.minibar')]);
await go('#/report'); log.push(['A8 banner off /report', !document.querySelector('.minibar')]);
await go('#/now/step/2'); document.querySelector('.minibar-x').click(); await sleep(60);
log.push(['A9 banner dismissed', !document.querySelector('.minibar')]);
await go('#/now/step/5'); log.push(['A10 step5 tel', [...document.querySelectorAll('a.tel')].map(a => a.getAttribute('href'))]);
await go('#/now/step/6'); log.push(['A11 step6 tel', [...document.querySelectorAll('a.tel')].map(a => a.getAttribute('href')), 'report button', !![...document.querySelectorAll('a.btn')].find(a => /Show this to the doctor/.test(a.textContent))]);
for (let s = 1; s <= 6; s++) { await go('#/now/step/' + s); document.querySelector('.actions a.btn-solid').click(); await sleep(60); }
log.push(['A12 steps completed', JSON.parse(localStorage.getItem('fs.biteRecord')).stepsCompleted, 'ended at', location.hash]);
await go('#/report');
const r1 = rows();
log.push(['A13 report rows', r1]);
log.push(['A14 time since', /\((.+ ago|just now)\)/.test(document.body.innerText), 'wash', r1.find(r => r.startsWith('Wound washing'))]);
await go('#/profile/medical');
setVal(document.querySelector('#name'), 'Asha'); setVal(document.querySelector('#age'), '11'); setVal(document.querySelector('#weight'), '32'); setVal(document.querySelector('#all'), 'penicillin');
setVal(document.querySelector('input[aria-label="Contact 1 name"]'), 'Amma'); setVal(document.querySelector('input[aria-label="Contact 1 phone"]'), '9876543210');
await sleep(80);
const med = JSON.parse(localStorage.getItem('fs.medical'));
log.push(['A15 medical saved', med.name, med.ageYears, med.weightKg, med.allergies, med.emergencyContacts[0]]);
await go('#/report');
log.push(['A16 report patient rows', rows().filter(r => /^(Name|Age|Weight|Allergies|Amma)/.test(r)), 'contact tel', [...document.querySelectorAll('a.rv[href^="tel:"]')].map(a => a.getAttribute('href'))]);
let copyMsg = ''; try { clickText(/^Copy as text$/); await sleep(250); copyMsg = [...document.querySelectorAll('.no-print .small')].map(x => x.textContent).find(t => /Copied|Could not/.test(t)) || 'no message'; } catch (e) { copyMsg = 'ERR ' + e.message; }
log.push(['A17 copy as text', copyMsg]);
localStorage.setItem('fs.theme', JSON.stringify('dark')); document.documentElement.dataset.theme = 'dark'; await sleep(60);
log.push(['A18 report in dark theme', getComputedStyle(document.querySelector('.report')).backgroundColor, getComputedStyle(document.querySelector('.rl')).color]);
document.documentElement.dataset.theme = 'light'; localStorage.setItem('fs.theme', JSON.stringify('light'));
await go('#/learn/symptoms'); log.push(['A19 checker removed', txt('h1')]);
await go('#/learn'); log.push(['A20 learn rows', [...document.querySelectorAll('.topic .t-main b')].map(b => b.textContent)]);
return log;
})()`

// Part B: regression of the earlier features (quiz, leaderboard, faq, videos, tracker, achievements, theme).
const FLOW_B = String.raw`(async () => {
${HELPERS}
await go('#/learn/quiz/easy'); await sleep(80);
let n = 0;
for (let i = 0; i < 15; i++) {
  const opts = [...document.querySelectorAll('.opt')];
  if (opts.length !== 4) { log.push(['B bad options at', i, opts.length]); break; }
  opts[i % 4].click(); await sleep(40); n++;
  [...document.querySelectorAll('button')].find(b => /Next question|See my score/.test(b.textContent)).click(); await sleep(40);
}
const nick = document.querySelector('#nick'); if (nick) setVal(nick, 'Tester');
clickText(/^Save score$/); await sleep(80);
log.push(['B1 quiz', n, 'score', txt('.score')?.replace(/\s+/g, ''), 'saved', JSON.parse(localStorage.getItem('fs.scores') || '[]').length]);
await go('#/leaderboard'); log.push(['B2 leaderboard rows', document.querySelectorAll('.lb').length]);
await go('#/learn/faq'); log.push(['B3 faq', document.querySelectorAll('details.faq').length]);
await go('#/learn/videos'); log.push(['B4 videos', document.querySelectorAll('.video a[target=_blank]').length]);
await go('#/profile/medical');
const d = new Date(); d.setDate(d.getDate() - 10);
const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
setVal(document.querySelector('#start'), iso); await sleep(40);
clickText(/^Start tracking$/); await sleep(120);
[...document.querySelectorAll('.dose .btn')][0].click(); await sleep(60);
setVal(document.querySelector('#place'), 'GH Chennai'); await sleep(60);
log.push(['B5 tracker', [...document.querySelectorAll('.dose .d span')].slice(0, 2).map(s => s.textContent), 'place', JSON.parse(localStorage.getItem('fs.vaccine')).place]);
await go('#/report'); log.push(['B6 report vaccine rows', rows().filter(r => /^(Current course|Doses taken)/.test(r))]);
await go('#/profile'); log.push(['B7 profile rows', [...document.querySelectorAll('.topic .t-count')].map(x => x.textContent), 'badges unlocked', [...document.querySelectorAll('.badge:not(.locked) b')].map(b => b.textContent)]);
await go('#/settings'); [...document.querySelectorAll('.seg .btn')].find(b => b.textContent === 'Dark').click(); await sleep(80);
log.push(['B8 dark', document.documentElement.dataset.theme, getComputedStyle(document.body).backgroundColor]);
[...document.querySelectorAll('.seg .btn')].find(b => b.textContent === 'Light').click(); await sleep(40);
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
  const openAndShot = async (hash, name, media) => {
    await send('Page.navigate', { url: url + hash })
    for (let i = 0; i < 50; i++) {
      if (await evaluate(`!!document.querySelector('h1, .btn-hero')`)) break
      await sleep(100)
    }
    await sleep(300)
    if (media) await send('Emulation.setEmulatedMedia', { media })
    await shot(name)
    if (media) await send('Emulation.setEmulatedMedia', { media: '' })
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true })

  await send('Page.navigate', { url })
  await sleep(800)
  await evaluate(`Object.keys(localStorage).forEach(k => localStorage.removeItem(k)); true`)
  await send('Page.navigate', { url })
  await sleep(800)

  console.log(JSON.stringify(await evaluate(FLOW_A), null, 1))
  console.log(JSON.stringify(await evaluate(FLOW_B), null, 1))

  // step 1 with the wash timer at 5:00 remaining: three prep blocks revealed under the timer
  await evaluate(`localStorage.setItem('fs.timer', JSON.stringify({ startedAt: Date.now() - 10 * 60 * 1000, duration: 900, alerted: false })); localStorage.setItem('fs.timerDismissed', 'null'); true`)
  await openAndShot('#/now/step/1', '17-step1-prep.png')
  await openAndShot('#/report', '12-report.png')
  await openAndShot('#/report', '13-report-print.png', 'print')
  await openAndShot('#/profile/medical', '14-medical-profile.png')
  await openAndShot('#/now/triage', '15-triage.png')
  await evaluate(`Object.keys(localStorage).forEach(k => localStorage.removeItem(k)); true`)
  await openAndShot('#/report', '16-report-empty.png')

  console.log(`page exceptions: ${exceptions}`)
  ws.close()
}

main()
  .catch((e) => {
    console.error('FAILED', e)
    process.exitCode = 1
  })
  .finally(() => proc.kill())
