/**
 * Diagnose the achievement triggers.
 * Usage: node scripts/qa_achievements.mjs [url] [chromePath] [shotDir]
 *
 * Runs four independent fresh-state journeys:
 *   A. steps 1-6 via Next, stopping ON step 6 (never opening the final hospital screen)
 *   B. steps 1-6 and on through to the final screen
 *   C. wash timer run to zero
 *   D. ten cards marked learned
 * Then reads Profile > Achievements after a real reload each time, so persistence is covered.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = (process.argv[2] ?? 'http://localhost:4180/').replace(/\/?$/, '/')
const chrome = process.argv[3] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const shotDir = process.argv[4] ?? join(process.cwd(), 'qa-shots')
const port = 9502
mkdirSync(shotDir, { recursive: true })
const profile = mkdtempSync(join(tmpdir(), 'fs-ach-'))

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
  const t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page')
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))

  let id = 0
  const pending = new Map()
  const exceptions = []
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data)
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d)
      pending.delete(d.id)
    } else if (d.method === 'Runtime.exceptionThrown') exceptions.push(d.params?.exceptionDetails?.text ?? 'exception')
  }
  const send = (method, params = {}) =>
    new Promise((res) => {
      const i = ++id
      pending.set(i, res)
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  const ev = async (e) => {
    const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) return { __error: r.result.exceptionDetails.text }
    return r.result?.result?.value
  }
  const goto = async (hash) => {
    await send('Page.navigate', { url: `${url}?t=${Date.now()}${hash}` })
    for (let i = 0; i < 60; i++) {
      if (await ev(`!!document.querySelector('h1, .btn-hero')`)) break
      await sleep(100)
    }
    await sleep(200)
  }
  const shot = async (name) => {
    // Full page: the badge list sits well below the fold on a 360px screen.
    await ev(`document.querySelectorAll('.actions, .bnav').forEach(e => e.style.position = 'static'); true`)
    const m = await send('Page.getLayoutMetrics')
    const h = Math.min(Math.ceil(m.result?.cssContentSize?.height ?? 740), 5000)
    const r = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: 360, height: h, scale: 2 },
    })
    if (r.result?.data) writeFileSync(join(shotDir, name), Buffer.from(r.result.data, 'base64'))
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true })

  const log = []

  const wipe = async () => {
    await goto('#/')
    await ev(`localStorage.clear()`)
    await goto('#/')
  }

  /** Read the achievements screen: which are unlocked, plus the raw stores behind them. */
  const readAchievements = async () =>
    ev(`(() => {
      const rows = [...document.querySelectorAll('.badge')];
      return {
        unlocked: rows.filter(r => !r.classList.contains('locked')).map(r => r.querySelector('b')?.textContent?.trim()),
        locked: rows.filter(r => r.classList.contains('locked')).map(r => r.querySelector('b')?.textContent?.trim()),
        rowCount: rows.length,
        stores: {
          flags: JSON.parse(localStorage.getItem('fs.flags') || 'null'),
          achievements: JSON.parse(localStorage.getItem('fs.achievements') || 'null'),
          stepsCompleted: JSON.parse(localStorage.getItem('fs.biteRecord') || 'null')?.stepsCompleted ?? null,
          nowStep: JSON.parse(localStorage.getItem('fs.nowStep') || 'null'),
        },
      };
    })()`)

  /** Click the primary Next/onward button on a step screen. */
  const clickOnward = () =>
    ev(`(() => {
      const a = document.querySelector('.actions .btn-solid');
      if (!a) return 'no onward button';
      const label = a.textContent.trim();
      a.click();
      return label;
    })()`)

  // ---------------------------------------------------------------- A. stop ON step 6
  await wipe()
  await goto('#/now/triage')
  await ev(`document.querySelector('.actions .btn-solid')?.click()`) // Start washing now
  await sleep(300)
  const pathA = []
  for (let step = 1; step <= 5; step++) {
    pathA.push(await ev(`document.querySelector('.eyebrow')?.textContent?.trim()`))
    pathA.push(await clickOnward())
    await sleep(250)
  }
  pathA.push(await ev(`document.querySelector('.eyebrow')?.textContent?.trim()`))
  log.push(['A journey (stopping on step 6)', pathA, 'hash now', await ev(`location.hash`)])
  await goto('#/profile')
  log.push(['A achievements after steps 1-6, never opened the final screen', await readAchievements()])
  await shot('40-ach-stopped-at-step6.png')

  // ---------------------------------------------------------------- B. continue to the final screen
  await goto('#/now/step/6')
  const onward6 = await clickOnward()
  await sleep(400)
  log.push(['B clicked step 6 onward', onward6, 'landed on', await ev(`location.hash`), 'h1', await ev(`document.querySelector('h1')?.textContent?.slice(0,40)`)])
  await goto('#/profile')
  log.push(['B achievements after reaching the final screen', await readAchievements()])

  // persistence across a real reload
  await goto('#/profile')
  log.push(['B still unlocked after reload', (await readAchievements()).unlocked])
  await shot('41-ach-after-final.png')

  // ---------------------------------------------------------------- C. wash timer to zero
  await wipe()
  await ev(`localStorage.setItem('fs.timer', JSON.stringify({ startedAt: Date.now() - 16 * 60 * 1000, duration: 900, alerted: false }))`)
  await goto('#/now/step/1')
  await sleep(900)
  await goto('#/profile')
  log.push(['C timer achievement', await readAchievements()])

  // ---------------------------------------------------------------- D. ten cards learned
  await wipe()
  await ev(`(() => {
    const learned = {};
    for (let i = 1; i <= 10; i++) learned[i] = true;
    localStorage.setItem('fs.learned', JSON.stringify(learned));
    localStorage.setItem('fs.streak', JSON.stringify({ last: new Date().toISOString().slice(0,10), count: 1 }));
    return true;
  })()`)
  await goto('#/profile')
  log.push(['D ten cards learned', await readAchievements()])

  log.push(['exceptions', exceptions.length, exceptions.slice(0, 3)])
  console.log(JSON.stringify(log, null, 1))
  ws.close()
}

main()
  .catch((e) => {
    console.error('FAILED', e)
    process.exitCode = 1
  })
  .finally(() => proc.kill())
