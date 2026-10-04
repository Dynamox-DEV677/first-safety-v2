/**
 * Logic tests that need no browser: the offline matcher (§9), the online matcher's fail-closed
 * schema and serverless function (§8), and the handover record (§7). Run: npm run test:logic
 * The function is tested against a fake Gemini - no key, no network.
 */
import { matchTranscript } from '../src/voice/match'
import { validateMatch } from '../src/voice/onlineSchema'
import { bloodGroupText, buildIncidentRecord, recordSpeech, recordText, type RecordInput } from '../src/report/buildReport'
import { emptyBite, type BiteRecord } from '../src/data/bite'
import { EMPTY_MEDICAL } from '../src/hooks/useMedical'
import * as api from '../api/match'
import { onlineMatchEnabled } from '../src/voice/online'
import { nextQuestion } from '../src/now/washFirst'

let passed = 0
const failures: string[] = []
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) passed++
  else failures.push(`${name}${detail === undefined ? '' : `  ->  ${JSON.stringify(detail)}`}`)
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// ---------------------------------------------------------------- offline matcher
const m = (t: string) => matchTranscript(t)
{
  const r = m('A street dog bit my hand and it is bleeding')
  check('en: dog/hand/bite/bleeding', r.animal === 'dog' && r.site === 'hand' && eq(r.contact, ['bite']) && r.bleeding === true && r.confident, r)
  const h = m('kutte ne haath pe kaata, khoon nikal raha hai')
  check('hinglish: kutte/haath/kaata/khoon', h.animal === 'dog' && h.site === 'hand' && h.contact.includes('bite') && h.bleeding === true, h)
  const dv = m('कुत्ते ने हाथ पर काटा')
  check('devanagari: कुत्ते/हाथ/काटा', dv.animal === 'dog' && dv.site === 'hand' && dv.contact.includes('bite'), dv)
  const ta = m('naai kadichu kaal la')
  check('tamil (latin): naai/kadichu/kaal', ta.animal === 'dog' && ta.site === 'leg' && ta.contact.includes('bite'), ta)
  const tas = m('நாய் கடித்தது கை')
  check('tamil script: நாய்/கடித்தது/கை', tas.animal === 'dog' && tas.site === 'hand' && tas.contact.includes('bite'), tas)
  const mk = m('bandar ne kaat liya')
  check('hinglish: bandar', mk.animal === 'monkey' && mk.contact.includes('bite'), mk)
  const fr = m("my friend's dog licked a cut on my arm")
  check('person ignored when an animal is named; lick on a cut', fr.animal === 'dog' && fr.site === 'arm' && fr.contact.includes('lick-broken'), fr)
  const amb = m('a cat or a rat, I am not sure')
  check('ambiguous -> candidates, not confident', !amb.confident && amb.animal === null && eq(amb.candidates, ['cat', 'rodent']), amb)
  check('snake -> out of scope', m('a snake bit me').notMammal)
  check('at clinic (en)', m('we reached the hospital').atClinic)
  check('at clinic (hinglish)', m('hospital pahunch gaye').atClinic)
  check('not at clinic yet', !m('we are going to the hospital now').atClinic)
  const neg = m("no blood, and it didn't break the skin")
  check('clean negatives', neg.bleeding === false && neg.brokeSkin === false, neg)
  check('two sites -> multiple', m('it bit my face and my hand').site === 'multiple')
  check('"my pet" is not a body site', m('my pet dog bit me').site === null)
  check('saliva in the eyes', m('the dog licked my eyes').contact.includes('saliva-mucosa'))
  check('nothing understood', !m('help please quickly').confident && m('help please quickly').candidates.length === 0)
}

// ---------------------------------------------------------------- online schema (client side)
{
  const good = { animal: 'dog', site: 'hand', broke_skin: true, confidence: 0.9, nextQuestion: 'when' }
  check('schema: valid accepted', !!validateMatch(good))
  check('schema: extra field rejected', validateMatch({ ...good, advice: 'go now' }) === null)
  check('schema: missing field rejected', validateMatch({ animal: 'dog', site: 'hand', broke_skin: true, confidence: 0.9 }) === null)
  check('schema: low confidence rejected', validateMatch({ ...good, confidence: 0.74 }) === null)
  check('schema: unclear animal rejected', validateMatch({ ...good, animal: 'unclear' }) === null)
  check('schema: bad enum rejected', validateMatch({ ...good, animal: 'snake' }) === null)
  check('schema: free-text question rejected', validateMatch({ ...good, nextQuestion: 'Is it deep?' }) === null)
  check('schema: unclear site -> null site', validateMatch({ ...good, site: 'unclear' })?.site === null)
  check('schema: string confidence rejected', validateMatch({ ...good, confidence: '0.9' }) === null)
}

check('online help is off by default (nothing stored)', onlineMatchEnabled() === false)

check('wash first: next question is the animal, then the site, then the facts',
  nextQuestion(null) === '/now/animal' &&
  nextQuestion({ animal: 'dog', site: '' }) === '/now/area' &&
  nextQuestion({ animal: 'dog', site: 'hand' }) === '/now/details')

// ---------------------------------------------------------------- serverless function, fake Gemini
const realFetch = globalThis.fetch
type Fake = (url: string, init: RequestInit) => Promise<Response>
function useFake(f: Fake) {
  globalThis.fetch = ((url: string, init: RequestInit) => f(url, init)) as typeof fetch
}
const post = (body: unknown, headers: Record<string, string> = { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.1' }) =>
  api.POST(new Request('https://example.test/api/match', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) }))
const modelReply = (obj: unknown) =>
  new Response(JSON.stringify({ steps: [{ type: 'thought' }, { type: 'model_output', content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

async function apiTests() {
  delete process.env.GEMINI_API_KEY
  check('api: no key -> 503', (await post({ text: 'dog bit hand' })).status === 503)

  process.env.GEMINI_API_KEY = 'test-key-not-real'
  const good = { animal: 'dog', site: 'hand', broke_skin: true, confidence: 0.92, nextQuestion: 'when' }
  let seen: { url: string; body: Record<string, unknown>; key: string | null } | null = null
  useFake(async (url, init) => {
    seen = { url, body: JSON.parse(String(init.body)), key: new Headers(init.headers).get('X-Goog-Api-Key') }
    return modelReply(good)
  })
  api.resetRateLimits()
  const r1 = await post({ text: 'street kutta bit my hand' })
  const b1 = r1.status === 200 ? await r1.json() : null
  check('api: valid model answer -> 200 with exactly the schema', r1.status === 200 && eq(b1, good), { status: r1.status, b1 })
  const s = seen as unknown as { url: string; body: Record<string, unknown>; key: string | null }
  check('api: Interactions endpoint', !!s && s.url.endsWith('/v1beta/interactions'), s?.url)
  check('api: store=false (Google keeps nothing)', !!s && s.body.store === false, s?.body)
  check('api: key sent in header, not URL', !!s && s.key === 'test-key-not-real' && !s.url.includes('test-key'))
  check('api: structured JSON response requested', !!s && (s.body.response_format as Record<string, unknown>)?.mime_type === 'application/json')

  for (const [name, reply] of [
    ['not JSON', 'sure! the animal was a dog'],
    ['low confidence', { ...good, confidence: 0.4 }],
    ['extra field', { ...good, tip: 'wash it' }],
    ['unclear animal', { ...good, animal: 'unclear' }],
  ] as [string, unknown][]) {
    api.resetRateLimits()
    useFake(async () => modelReply(reply))
    check(`api: ${name} -> 204 (phone uses its tap list)`, (await post({ text: 'something bit me' })).status === 204)
  }

  api.resetRateLimits()
  const tried: string[] = []
  useFake(async (_url, init) => {
    const model = String(JSON.parse(String(init.body)).model)
    tried.push(model)
    return tried.length === 1 ? new Response(JSON.stringify({ error: { status: 'UNAVAILABLE' } }), { status: 503 }) : modelReply(good)
  })
  const fb = await post({ text: 'street kutta bit my hand' })
  check('api: first model busy -> next model answers -> 200', fb.status === 200 && tried.length === 2 && tried[0] !== tried[1], { status: fb.status, tried })
  check('api: Flash-Lite tried first', tried[0] === api.MODELS[0] && /flash-lite/.test(api.MODELS[0]), api.MODELS)

  api.resetRateLimits()
  useFake(async () => new Response('quota', { status: 429 }))
  check('api: upstream error -> 204', (await post({ text: 'dog bite' })).status === 204)

  api.resetRateLimits()
  useFake((_url, init) => new Promise((_res, rej) => init.signal?.addEventListener('abort', () => rej(new Error('aborted')))))
  const t0 = Date.now()
  // AbortSignal.timeout's timer does not hold Node's event loop open (a real request does).
  const keepAlive = setInterval(() => {}, 100)
  const slow = await post({ text: 'dog bite' })
  clearInterval(keepAlive)
  const took = Date.now() - t0
  check('api: slow model -> 204 within the 2 s upstream budget', slow.status === 204 && took < 2400, { status: slow.status, took })

  api.resetRateLimits()
  useFake(async () => modelReply(good))
  let last = 0
  for (let i = 0; i < 7; i++) last = (await post({ text: 'dog bite' })).status
  check('api: 7th call in a minute from one IP -> 429', last === 429, last)

  api.resetRateLimits()
  check('api: text over 300 chars -> 400', (await post({ text: 'x'.repeat(301) })).status === 400)
  check('api: empty text -> 400', (await post({ text: '   ' })).status === 400)
  check('api: not JSON -> 415', (await post('text=dog', { 'content-type': 'text/plain' })).status === 415)
  check('api: GET -> 405', api.GET().status === 405)
  globalThis.fetch = realFetch
}

// ---------------------------------------------------------------- the handover record
function input(bite: BiteRecord | null, extra: Partial<RecordInput> = {}): RecordInput {
  return { bite, med: EMPTY_MEDICAL, vaccine: null, liveWashSeconds: null, timerRunning: false, now: new Date(), ...extra }
}
function rows(rec: ReturnType<typeof buildIncidentRecord>) {
  const out: Record<string, string> = {}
  for (const s of rec.sections) for (const r of s.rows ?? []) out[r.key] = r.value
  return out
}
function lists(rec: ReturnType<typeof buildIncidentRecord>) {
  const out: Record<string, string[]> = {}
  for (const s of rec.sections) if (s.list) out[s.list.key] = s.list.items
  return out
}
const FORBIDDEN = /categor|risk|you will be fine|you'll be fine|no need|not needed|safe to|immunoglobulin/i

{
  const now = new Date()
  const iso = (minAgo: number) => new Date(now.getTime() - minAgo * 60_000).toISOString()

  const empty = buildIncidentRecord(input(null, { now }))
  const er = rows(empty)
  check('record: nothing known -> every row says Unknown', Object.values(er).every((v) => v.startsWith('Unknown')), er)
  check('record: nothing known -> DONE says Unknown', eq(lists(empty).DONE, ['Unknown']))
  const nd = (lists(empty).WOUND_CARE ?? []).join(' | ')
  check('record: nothing known -> neutral heading, asks about substances and closure', !('NOT_DONE' in lists(empty)) && nd.includes('Substances on the wound: Unknown') && nd.includes('Stitches or wound closure: Unknown'), nd)
  const et = recordText(empty, 'en')
  check('record: closing lines verbatim', et.includes('Recorded by the patient or a bystander in the First Safety app.') && et.includes('This is a record of what happened. It contains no medical assessment.'))
  check('record: title', et.startsWith('FIRST SAFETY — INCIDENT RECORD'))

  const b: BiteRecord = {
    ...emptyBite(iso(34), 'wash'),
    washStartedAt: iso(31),
    washSeconds: 900,
    animal: 'dog',
    animalKnown: 'no',
    site: 'hand',
    contact: ['bite'],
    bleeding: 'yes',
    brokeSkin: 'yes',
    substances: ['none'],
    substancesAt: iso(20),
    closure: 'open',
  }
  const full = buildIncidentRecord(input(b, { now }))
  const fr = rows(full)
  check('record: time of bite + minutes ago + source of the time', /\(34 minutes ago\) — when First Safety was opened$/.test(fr.TIME_OF_BITE), fr.TIME_OF_BITE)
  check('record: washing started 3 min after bite', fr.WASH_STARTED.endsWith('(3 min after bite)'), fr.WASH_STARTED)
  check('record: 15 min completed', fr.WASH_DURATION === '15 min 00 s — completed', fr.WASH_DURATION)
  check('record: stray', fr.KNOWN_STRAY === 'Stray or wild — not traceable')
  check('record: no vaccination row for a stray', !('ANIMAL_VACCINATED' in fr))
  check('record: stray dog not observable', fr.OBSERVABLE === 'No')
  check('record: site, contact, bleeding, skin', fr.SITE === 'Hands or fingers' && fr.CONTACT === 'Bite' && fr.BLEEDING === 'Yes' && fr.SKIN_BROKEN === 'Yes', fr)
  const fl = lists(full)
  check('record: done list', eq(fl.DONE, ['Wound washed for 15 min 00 s (timed in the app)', 'Wound left open, not bandaged']), fl.DONE)
  check('record: clean negatives reported', eq(fl.NOT_DONE, ['No turmeric, chilli, oil or other substance applied', 'No stitches, no wound closure']), fl.NOT_DONE)
  check('record: priors unknown', fr.PRIOR_RABIES === 'Unknown' && fr.PRIOR_TETANUS === 'Unknown')
  const ft = recordText(full, 'en')
  check('record: no assessment words', !FORBIDDEN.test(ft), ft.match(FORBIDDEN)?.[0])

  const half = lists(buildIncidentRecord(input({ ...b, closure: '' }, { now })))
  check('record: one part unknown -> heading stays neutral', !!half.WOUND_CARE && !half.NOT_DONE && half.WOUND_CARE.includes('Stitches or wound closure: Unknown'), half)

  check('blood group: "o+" spelled out', bloodGroupText('o+') === 'O positive (O+)', bloodGroupText('o+'))
  check('blood group: "B -ve", "ab+", "0+"', bloodGroupText('B -ve') === 'B negative (B−)' && bloodGroupText('ab+') === 'AB positive (AB+)' && bloodGroupText('0+') === 'O positive (O+)')
  check('blood group: unrecognised text kept as typed', bloodGroupText(' Bombay ') === 'Bombay' && bloodGroupText('') === '')

  const turmeric = buildIncidentRecord(input({ ...b, substances: ['turmeric', 'oil'] }, { now }))
  const tl = lists(turmeric).NOT_DONE
  check('record: turmeric reported plainly, with the time the app was told', tl.some((x) => /^Turmeric applied to the wound \(reported at \d\d:\d\d\)$/.test(x)) && tl.some((x) => x.startsWith('Oil applied')), tl)

  const tell = buildIncidentRecord(input({ ...emptyBite(iso(5), 'tell') }, { now }))
  check('record: opened later, bite time never asked -> Unknown + when opened', /^Unknown — First Safety was opened at \d\d:\d\d$/.test(rows(tell).TIME_OF_BITE), rows(tell).TIME_OF_BITE)

  const est = { ...emptyBite(iso(5), 'tell'), biteEstimate: '30' as const, biteAt: iso(35) }
  check('record: estimate marked as estimate', /^≈ .*\(35 minutes ago\) — estimated by the patient$/.test(rows(buildIncidentRecord(input(est, { now }))).TIME_OF_BITE))

  const over = { ...emptyBite(iso(5), 'tell'), biteEstimate: 'over60' as const, biteAt: '' }
  check('record: over an hour -> Unknown, never a made-up time', /^Unknown — more than 1 hour before/.test(rows(buildIncidentRecord(input(over, { now }))).TIME_OF_BITE))

  const med = { ...EMPTY_MEDICAL, name: 'Owner', everVaccinated: 'yes' as const, tetanusLastDate: '2024-03-12' }
  const other = buildIncidentRecord(input({ ...b, patient: 'other' }, { now, med }))
  check("record: someone else bitten -> the owner's profile is not used", rows(other).PRIOR_RABIES === 'Unknown' && !other.sections.some((s) => s.id === 'patient'))
  const me = buildIncidentRecord(input({ ...b, patient: 'me' }, { now, med }))
  check('record: owner bitten -> profile used and labelled', rows(me).PRIOR_RABIES === 'Yes (saved profile)' && rows(me).PRIOR_TETANUS.includes('(saved profile)'), rows(me))

  const running = buildIncidentRecord(input({ ...b, washSeconds: 0 }, { now, liveWashSeconds: 200, timerRunning: true }))
  check('record: timer still running', rows(running).WASH_DURATION === '3 min 20 s so far — still washing', rows(running).WASH_DURATION)

  const hi = recordText(full, 'hi')
  check('record: Hindi labels side by side with English', hi.includes('काटने का समय / TIME OF BITE') && hi.includes('घाव की जगह / SITE'))
  check('record: Hindi keeps values as entered', hi.includes('Hands or fingers') && hi.includes('15 min 00 s — completed'))
  check('record: Hindi has both closing notes', hi.includes('इसमें कोई चिकित्सीय आकलन नहीं है') && hi.includes('It contains no medical assessment.'))
  check('record: speech ends with the no-assessment line', recordSpeech(full, 'en').endsWith('It contains no medical assessment.'))
}

await apiTests()
console.log(`${passed} passed, ${failures.length} failed`)
for (const f of failures) console.log(`  FAIL ${f}`)
if (failures.length) process.exit(1)
