# First Safety

First aid for animal bites and scratches, for Indian school students and the people around them.
It works with no network, no account and no API key. Every clinical line on screen is quoted from
WHO or NCDC India, with the source shown. **[SOURCES.md](SOURCES.md)** lists every document, its URL
and the date it was read.

## What it refuses to do

- **It does not diagnose.** No symptom checker, no "you'll be fine".
- **It never tells you your WHO exposure category**, how likely rabies is, or whether you need
  immunoglobulin. That is a clinician's call, made with the patient in front of them; a phone that
  gets it wrong either sends someone home to die or floods a clinic.
- **No AI writes anything you read.** Not a step, not a warning, not a word of the report.
- **Your data stays on the phone.** No account, no analytics, no server for your data. The handover
  record is never uploaded; copy, share and read-aloud each start from your own tap. The one thing
  that can leave is a few typed or spoken words the app couldn't place, sent to the optional online
  matcher (on by default, one switch in Settings to turn off).

## What it does

It washes, it times, it records, it hands over.

1. **Two buttons.** Red *Start the 15 minutes* starts the wound-wash timer at once — WHO says wash
   with soap and running water for 15 minutes. Grey *Tell me what happened* is for afterwards: on
   the way to a clinic, wanting to know what next.
2. **The 15-minute timer** keeps true time through a locked screen, a backgrounded app and a reload.
3. **Any mammal** — dog, cat, monkey, rat, bat, mongoose, livestock, person — with what the sources
   say about that animal, verbatim and cited. Snakes, insects and spiders: one line, call 108.
4. **Where is the bite**, and a few facts for the clinic — when it happened, bite / scratch / lick,
   skin broken, bleeding, stray or known, anything put on the wound, stitched or open.
5. **"I'm at the clinic"** — always one tap away — opens the **incident record**: time of bite and
   minutes since, when washing started and for how long, the animal, the site, what was done and,
   just as important, what was *not* done ("No turmeric, chilli, oil or other substance applied").
   Every unknown says **Unknown** so the clinician knows to ask. Large mono type to hold up across a
   counter, Hindi labels beside the English, copy, share, print, and read aloud with the phone's
   own voice. It ends: *"This is a record of what happened. It contains no medical assessment."*

## Offline is the app

The test, run before every submission (`scripts/qa_v2.mjs` does it automatically):

```
Delete the Gemini API key entirely. Turn off wifi and mobile data.
Open the app on a phone that has loaded it once.
Every feature must still work and every screen must still be complete.
```

No screen waits on a network call. No spinner can be left spinning. The optional online matcher
(below) has 2.5 seconds and then the app silently uses its own answer.

## v2 at a glance (ML Empowerment 3.0)

| | Where |
|---|---|
| Entry screen, fresh-load rules, "New incident" | `src/now/EntryScreen.tsx`, `src/components/ModeSelector.tsx` |
| All mammals, sourced and behind the verify gate | `content/`, `src/content/index.ts`, `src/components/Sourced.tsx` |
| Site question (six options, one screen) | `src/now/AreaScreen.tsx` |
| Facts for the clinic | `src/now/TriageFlow.tsx` (route `#/now/details`) |
| Incident record | `src/report/buildReport.ts`, `src/report/Report.tsx` |
| Voice and typing, on the phone | `src/voice/`, `src/now/VoiceInput.tsx`, `src/components/VoiceOffer.tsx` |
| Optional online matcher | `api/match.ts`, `src/voice/online.ts`, `src/voice/onlineSchema.ts` |

**Voice** (`src/voice/`) is optional and never downloads during an emergency. On the LEARN home
(or Settings) one tap downloads Whisper tiny (English) and its runtime, about 70 MB, once; after
that a tap records up to ten seconds and the phone transcribes it in a worker. Typing works with no
download at all. An explicit synonym table (English, Hinglish, Hindi, Tamil — *kutta*, *billi*,
*bandar*, *naai*, *poonai*, कुत्ता, நாய்…) turns the words into the same taps the patient could have
made, shown back for confirmation. If the model isn't on the phone, the screen says *"Voice needs a
one-time download. Tap answers for now."* and the buttons are right there.

## Medical safety

Every first-aid step, fact, quiz answer and FAQ is **hard-coded** under `src/data/` from:

- WHO rabies fact sheet
- WHO Expert Consultation on Rabies, third report (TRS 1012, 2018)
- NCDC India, National Guidelines for Rabies Prophylaxis (2019)
- ICMR national survey of animal bites and rabies deaths (2022-23) for India figures
- Government of India ERSS (112) for emergency numbers

Sources are listed per item in `src/data/sources.ts` and shown in the app. Nothing is generated at runtime. Do not let a model write or edit anything in `src/data/`.

The bite record and the incident record **record what the patient reports and never interpret it**: no category, no score, no recommendation, no allergy warnings. The doctor decides everything. There is deliberately no symptom checker: symptoms do not change the action (every skin-breaking bite needs the vaccine the same day).

Left empty until a person verifies them against an official source:

- `hospitals` in `src/data/nowMode.ts` - state-wise anti-rabies centres. Record who verified each entry and when.
- `vaccineInfo` in `src/data/nowMode.ts` - whether the vaccine is free in each state. Every state shows "not verified - call 104" until filled in.

Videos in `src/data/videos.ts` were verified to exist via YouTube's oEmbed API (title and channel copied from the response) but were not produced by this project. Watch each one before publishing.

## Nearest hospitals (live, no backend)

The help screen has a "Find nearest hospital" button. On tap it asks the browser for a location,
then queries the public OpenStreetMap Overpass API for `amenity=hospital` within 10 km, sorts by
haversine distance and shows the closest five. Each result gets an action: a `tel:` link when OSM
has a phone number, otherwise directions. No API key, no account.

It is strictly additive. The hard-coded state list is rendered underneath at all times, so denial,
timeout, an overloaded Overpass instance or airplane mode all end in a one-line note rather than an
error screen. There is nothing to "fall back to" because the fallback never left the screen.

- Location is asked for only on tap, never on load.
- The last fix is cached in `fs.geo` for 30 minutes so a repeat visit does not re-prompt.
  "Update my location" forces a fresh fix.
- The last successful result set is cached in `fs.nearby` so a later offline visit still shows
  something, labelled with how old it is.
- Results come from a community map, so the UI says plainly that they are unverified and may not
  stock the vaccine.

The main Overpass instance returns 504 under load often enough to matter, so one mirror is tried
before giving up (5 s then 4 s).

## Emergency contacts and the confirm popup

Up to three people - a parent, another adult, the school nurse - each becoming a "Call <name>"
button beside the emergency numbers on `#/now/help`. With none saved, the button reads "Add an
emergency contact" and links to Settings, so it is never a dead control.

Tapping a name does not dial. It opens a confirm dialog showing the name, the relation and the
number, with Cancel and Call now; only Call now sets `window.location.href = 'tel:...'`. A student
in a panic mis-taps, and a pocket-dial to a parent at the wrong moment is a real cost, so one extra
tap buys a lot. Escape and a tap outside also cancel. Focus lands on the dialog rather than on Call
now, so a stray Enter cannot place the call.

localStorage only. No account, no sync, no network at any point - the whole flow works in airplane
mode, because a `tel:` handoff is an intent rather than a request.

**One list, not two.** These are the same contacts as the medical profile's, stored once in
`fs.medical.emergencyContacts` and edited from either screen. A separate list would drift: a
student updates one, and the other - including the number printed on the doctor's report - goes
stale. `fs.medical` is also what "Reset all data" and "Clear all medical info" clear.

An earlier build kept a single contact under `fs.emergencyContact` and backed it up to Supabase.
That is gone. `migrateLegacyContact()` in `src/hooks/useEmergencyContact.ts` folds any such saved
contact into the shared list once, at app start, then removes the old key.

## Not built, on purpose

- A global leaderboard or crowdsourced hospital ratings: both need a server. The leaderboard is per device.
- Embedded YouTube players: they load Google scripts and cookies into an app used by children and do not work offline. Videos are links.
- Push notifications: no server. Reminders show when the app is opened on a dose day; the calendar export gives real alarms.
- A symptom checker, a risk score, a WHO-category calculator. App accounts, logins, analytics, tracking of any kind.
- Any upload of the medical profile, the bite record or the incident record. Those stay on the phone.
- Firebase or any backend for user data. The one serverless function (below) holds no data.

## Optional online matcher (Gemini)

Built last and built to be deleted. **The app is complete without it.**

It has exactly one job: when someone typed or said something the offline matcher could not place,
pick which existing protocol it is. It returns only `{animal, site, broke_skin, confidence,
nextQuestion}`, validated on the server and again on the phone; anything outside that schema, any
confidence below 0.75, any error or a reply slower than 2.5 seconds, and the app falls back to its
own tap list without telling anyone. It never writes a word the user reads.

It is **on by default** (the owner's decision) and one switch turns it off: Settings → Online help
for unclear answers. It sends only the person's words — never the report, never audio — and the
screen says so under the type box. `scripts/qa_v2.mjs` checks that the only request that ever
leaves is `POST /api/match` carrying `{text}`; with the switch off, there is none.

To turn it on for a deployment:

1. An adult with a Google account creates a Gemini API key in Google AI Studio (Google's terms
   require the key holder to be 18 or over).
2. Vercel → Project → Settings → Environment Variables → `GEMINI_API_KEY`. Never in the repo, never
   in a `.env` that gets committed, never in a screenshot or a chat. `.env.example` holds the empty
   name only. Optional: `GEMINI_MODEL` (default `gemini-3.5-flash-lite`; `gemini-3.8-flash` is
   always tried next when the first is busy).
3. Google Cloud Console → the key → restrict it to the *Generative Language API* only. If you also
   add an HTTP-referrer restriction, set `GEMINI_REFERER` to your site's URL so the function sends it.
4. The function rate-limits itself (6 calls a minute per IP, 60 per instance) and sends
   `store: false` so Google does not keep the text.

**To delete it** (five minutes): remove `api/match.ts`, `src/voice/online.ts`,
`src/voice/onlineSchema.ts`, `tsconfig.api.json`, the "Online help" block in
`src/components/Settings.tsx`, and the one `askOnlineMatcher` call in `src/now/VoiceInput.tsx`;
drop `&& tsc --noEmit -p tsconfig.api.json` from the build script.

## Design

The v2 tokens on `:root` (`--paper`, `--ground`, `--ink`, `--red` and friends), Archivo for
everything and IBM Plex Mono for clocks, labels and the record — both self-hosted so nothing loads
from the network. Red means one thing: an urgent action. Red fills that carry words use `--red-deep`
so every instruction reaches 7:1 contrast in both themes; secondary text is `--ink-2` for the same
reason. Buttons are at least 64px tall; the two entry buttons are 132px. Designed at 360px first and
tested at 360 / 390 / 414. The incident record is white in both themes.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build        # typecheck the app and the serverless function, then build dist/
npx vite preview --port 4180 --strictPort   # serve dist/ with the service worker active
```

## Test

```bash
npm run test:logic                                    # matcher, schema, serverless function (fake Gemini), incident record
node scripts/qa_v2.mjs http://localhost:4180/         # every v2 screen at 360/390/414, 7:1 contrast both themes, network, offline
node scripts/qa_voice.mjs http://localhost:4180/      # voice with a fake microphone: no-model path, opt-in download, online and offline
node scripts/qa_timer_v2.mjs http://localhost:4180/   # timer through a frozen (locked/backgrounded) page and a reload
```

`docs/VERIFY.md` records the results against the brief's checklist.

## Deploy (Vercel)

Live at https://first-safety.vercel.app (the existing `first-safety` project; v2 replaced v1 on
2 Oct 2026 — v1's deployments stay in the project's history for an instant rollback).
`vercel.json` sets the Vite framework, `dist` output, no-cache headers for `sw.js`, and runs the
function in Mumbai (`bom1`). `api/match.ts` answers 503 until `GEMINI_API_KEY` is set, and the app
falls back silently.

Deploy from a git-free copy of the committed code, because Vercel blocks deploys whose git commit
author email is not on the Vercel account:

```bash
rm -rf ../deploy-v2 && mkdir -p ../deploy-v2/.vercel && git archive HEAD | tar -x -C ../deploy-v2
cp .vercel/project.json ../deploy-v2/.vercel/ && cd ../deploy-v2 && vercel deploy --prod --yes
```

## Layout

```
content/         sourced clinical text: common, situations, animals/* (each string: text, source, url, accessed, verified)
api/             the optional online matcher (one serverless function)
src/content/     loads content/ and applies the verify gate
src/data/        hard-coded v1 content: nowMode, learnMode, quizzes, faq, videos, achievements, bite, sources
src/hooks/       localStorage, hash routing, timer, theme, learn progress, scores, vaccine tracker, bite record, medical profile
src/now/         emergency path: entry, animal, site, facts, steps, timer, final screen, help, voice input
src/report/      the incident record (buildReport.ts builds it; Report.tsx shows, copies, shares, reads aloud, prints)
src/voice/       on-device speech (worker), the synonym matcher, the optional online matcher client
src/learn/       cards, FAQ, videos, bookmarks
src/quiz/        quiz home and play
src/profile/     profile, medical profile, vaccination tracker, achievements
src/components/  header, bottom nav, footer, settings, sources, sourced lines, tel link, voice offer
scripts/         QA in headless Chrome, logic tests, icon generator
docs/            VERIFY.md (the checklist), DEMO.md (the video), SUBMISSION.md (draft)
```
