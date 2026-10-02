/**
 * POST /api/match - the optional online matcher (v2 brief §8). Vercel serverless function.
 *
 * One job: given a short free-text description that the phone's own matcher was not sure about,
 * pick which existing protocol it is. Returns ONLY {animal, site, broke_skin, confidence,
 * nextQuestion}, schema-validated here and again on the phone. It never writes instructions, wound
 * descriptions, risk, categories, reassurance, or any part of the handover report.
 *
 * Key handling: GEMINI_API_KEY lives only in Vercel -> Project -> Settings -> Environment Variables.
 * Never in the repo, never in the client bundle. Requests are sent with store=false so Google does
 * not keep them. The words are never logged - only, when something fails, which step failed, the
 * upstream status or error code, and the time taken. Rate limited per IP and per instance.
 *
 * DELETE IN FIVE MINUTES: remove this file, src/voice/online.ts, src/voice/onlineSchema.ts, the
 * "Online help" block in Settings and the one call in src/now/VoiceInput.tsx. The app is complete
 * without it.
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'
/**
 * Tried in order while the time budget lasts: a busy (429/5xx) or unreachable model hands over to
 * the next. Flash-Lite first - picking an animal from a short sentence needs speed, not depth.
 */
export const MODELS = [...new Set([process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite', 'gemini-3.8-flash'])]
const MIN_ATTEMPT_MS = 500
/** The phone gives up at 2.5 s, so the upstream call gets less than that. */
const UPSTREAM_TIMEOUT_MS = 2000
const MAX_TEXT = 300
const MAX_BODY = 2048
const PER_IP_PER_MINUTE = 6
const PER_INSTANCE_PER_MINUTE = 60
const MIN_CONFIDENCE = 0.75

const ANIMALS = ['dog', 'cat', 'monkey', 'rodent', 'bat', 'mongoose', 'livestock', 'human', 'unclear']
const SITES = ['head_neck', 'hand', 'arm', 'leg', 'body', 'multiple', 'unclear']
const QUESTIONS = ['animal', 'site', 'broke_skin', 'bleeding', 'known', 'when', 'substances']
const KEYS = ['animal', 'site', 'broke_skin', 'confidence', 'nextQuestion']

export const SCHEMA = {
  type: 'object',
  properties: {
    animal: { type: 'string', enum: ANIMALS, description: 'Which animal bit, scratched or licked. "unclear" if not stated.' },
    site: { type: 'string', enum: SITES, description: 'Where on the body. "multiple" if more than one place. "unclear" if not stated.' },
    broke_skin: { type: ['boolean', 'null'], description: 'Whether the skin was broken; null if not stated.' },
    confidence: { type: 'number', description: 'Confidence from 0 to 1 that "animal" is right.' },
    nextQuestion: {
      type: ['string', 'null'],
      description: `The most useful question to ask next, by id, one of: ${QUESTIONS.join(', ')}. null if none.`,
    },
  },
  required: KEYS,
}

const SYSTEM =
  'You sort a short description of an animal bite into fixed categories for an offline first-aid app. ' +
  'Return only JSON that matches the schema. Use only what the description says; if something is not ' +
  'stated, use "unclear" or null. Never add advice, warnings or any other text. The description may be ' +
  'in English, Hindi, Hinglish or Tamil.'

export interface Match {
  animal: string
  site: string
  broke_skin: boolean | null
  confidence: number
  nextQuestion: string | null
}

/** Exact schema, nothing extra, and confident enough - or null. */
export function validate(x: unknown): Match | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null
  const o = x as Record<string, unknown>
  const keys = Object.keys(o)
  if (keys.length !== KEYS.length || !KEYS.every((k) => keys.includes(k))) return null
  if (typeof o.animal !== 'string' || !ANIMALS.includes(o.animal) || o.animal === 'unclear') return null
  if (typeof o.site !== 'string' || !SITES.includes(o.site)) return null
  if (o.broke_skin !== null && typeof o.broke_skin !== 'boolean') return null
  if (typeof o.confidence !== 'number' || !Number.isFinite(o.confidence) || o.confidence < 0 || o.confidence > 1) return null
  if (o.confidence < MIN_CONFIDENCE) return null
  if (o.nextQuestion !== null && (typeof o.nextQuestion !== 'string' || !QUESTIONS.includes(o.nextQuestion))) return null
  return o as unknown as Match
}

/** The model's text from an Interactions API response (the final model_output step). */
export function extractText(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.output_text === 'string') return d.output_text
  const steps = Array.isArray(d.steps) ? (d.steps as Record<string, unknown>[]) : []
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i]
    if (s?.type !== 'model_output') continue
    const c = s.content
    if (typeof c === 'string') return c
    if (Array.isArray(c)) {
      const text = c
        .map((p) => (p && typeof p === 'object' && (p as Record<string, unknown>).type === 'text' ? (p as Record<string, unknown>).text : ''))
        .filter((v): v is string => typeof v === 'string')
        .join('')
      if (text) return text
    }
  }
  return null
}

// ---- rate limiting: per IP and per instance, sliding one-minute window ----
const perIp = new Map<string, number[]>()
let perInstance: number[] = []

export function rateLimited(ip: string, now: number): boolean {
  const cutoff = now - 60_000
  perInstance = perInstance.filter((t) => t > cutoff)
  const mine = (perIp.get(ip) ?? []).filter((t) => t > cutoff)
  if (perInstance.length >= PER_INSTANCE_PER_MINUTE || mine.length >= PER_IP_PER_MINUTE) {
    perIp.set(ip, mine)
    return true
  }
  mine.push(now)
  perInstance.push(now)
  perIp.set(ip, mine)
  if (perIp.size > 5000) perIp.clear()
  return false
}

/** For tests only. */
export function resetRateLimits(): void {
  perIp.clear()
  perInstance = []
}

function reply(status: number, body: unknown): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

async function callModel(key: string, text: string): Promise<Match | null> {
  const started = Date.now()
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key }
  // A key restricted to the app's domain (HTTP referrer restriction) needs the referrer sent.
  if (process.env.GEMINI_REFERER) headers.referer = process.env.GEMINI_REFERER
  for (const model of MODELS) {
    const left = UPSTREAM_TIMEOUT_MS - (Date.now() - started)
    if (left < MIN_ATTEMPT_MS) break
    const outcome = await attempt(model, text, headers, started, left)
    if (outcome !== 'busy') return outcome
  }
  return null
}

/** One call to one model. 'busy' (429, 5xx, network) hands over to the next model while time lasts. */
async function attempt(
  model: string,
  text: string,
  headers: Record<string, string>,
  started: number,
  left: number,
): Promise<Match | null | 'busy'> {
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(left),
      body: JSON.stringify({
        model,
        store: false,
        system_instruction: SYSTEM,
        input: `Description: """${text}"""`,
        response_format: { type: 'text', mime_type: 'application/json', schema: SCHEMA },
        generation_config: { temperature: 0, thinking_level: 'low' },
      }),
    })
    if (!r.ok) {
      let code = ''
      try {
        const e = (await r.json()) as { error?: { status?: string; message?: string } }
        code = `${e.error?.status ?? ''} ${String(e.error?.message ?? '').slice(0, 160)}`.trim()
      } catch {
        // no error body
      }
      note('upstream', started, model, { status: r.status, code })
      return r.status === 429 || r.status >= 500 ? 'busy' : null
    }
    const data = (await r.json()) as Record<string, unknown>
    const raw = extractText(data)
    if (!raw) {
      note('shape', started, model, { keys: Object.keys(data ?? {}), steps: describeSteps(data) })
      return null
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const match = validate(parsed)
    // Categories only - never the words. "unclear" or low confidence is a normal fallback, not an error.
    if (!match) note('no-match', started, model, { keys: Object.keys(parsed ?? {}), animal: parsed?.animal, site: parsed?.site, confidence: parsed?.confidence })
    return match
  } catch (e) {
    const name = e instanceof Error ? e.name : typeof e
    note('error', started, model, { name, message: e instanceof Error ? e.message.slice(0, 160) : '' })
    return name === 'TimeoutError' || name === 'AbortError' ? null : 'busy'
  }
}

/** One short line in the function log. Never includes the text that was sent. */
function note(at: string, started: number, model: string, info: Record<string, unknown>): void {
  console.error(JSON.stringify({ at, ms: Date.now() - started, model, ...info }))
}

function describeSteps(data: Record<string, unknown>): string[] | null {
  if (!Array.isArray(data?.steps)) return null
  return (data.steps as Record<string, unknown>[]).map((s) => {
    const c = s?.content
    const kinds = Array.isArray(c) ? c.map((p) => (p as Record<string, unknown>)?.type).join('/') : typeof c
    return `${String(s?.type)}:${kinds}`
  })
}

export async function POST(request: Request): Promise<Response> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return reply(503, { error: 'unavailable' })
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return reply(415, { error: 'json only' })
  }
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  if (rateLimited(ip, Date.now())) return reply(429, { error: 'slow down' })

  let text: unknown
  try {
    const raw = await request.text()
    if (raw.length > MAX_BODY) return reply(413, { error: 'too long' })
    text = (JSON.parse(raw) as Record<string, unknown>)?.text
  } catch {
    return reply(400, { error: 'bad json' })
  }
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT) return reply(400, { error: 'bad text' })

  const match = await callModel(key, text.trim())
  // No match is not an error for the phone: it simply uses its own tap list.
  return match ? reply(200, match) : new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } })
}

export function GET(): Response {
  return reply(405, { error: 'POST only' })
}
