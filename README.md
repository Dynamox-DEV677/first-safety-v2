# First Safety

Animal-bite first aid and rabies prevention for Indian school students. The first 15 minutes matter most.

Everything runs offline on the phone. No accounts, no analytics, no tracking.

Two features reach the network, each only on an explicit tap, and each degrades to the offline
path: the nearest-hospital lookup, and the one-time download of the speech model from Settings.
Everything else - first aid, the timer, all learning content, contacts, the medical profile and the
doctor's report - never leaves the device. Audio never leaves it either: speech is transcribed on
the phone.

## v2 (ML Empowerment 3.0)

- **Entry screen** - two buttons. Red *Start the 15 minutes* starts the wash timer at once; grey
  *Tell me what happened* opens the animal picker. A fresh load always starts here.
- **All mammal bites** - dog, cat, monkey, rodent, bat, mongoose, livestock, person. Every line of
  guidance lives in `content/` with its source, URL, access date and a `verified` flag; unverified
  lines are held back by the gate. Snakes, insects and spiders are out of scope and say so.
- **Area of injury** - where, and what the animal did, in the words of the NCDC patient form. The
  app never assigns a WHO category.
- **Handover report** - a five-second summary line, the 10-day-observation rule in NCDC's words,
  the sourced lines for the animal, and a *New incident* action.
- **Voice** (`src/voice/`) - optional. *Prepare voice* in Settings downloads Whisper tiny (English,
  about 70 MB with the runtime) once; after that a tap records up to ten seconds, the phone
  transcribes it in a worker, and deterministic word lists pre-fill the same taps the patient could
  have made, shown back for confirmation. Nothing downloads during an emergency: until it is
  prepared, the emergency screens simply show the buttons. `node scripts/qa_voice.mjs` proves all
  of this in headless Chrome with a fake microphone, online and with the network cut.

- **NOW** - one big button, three optional taps (body part, broke skin, dog known), six first-aid steps one per screen, a 15-minute wound-wash timer that survives navigation and reloads (audio + vibration at zero), a prep panel that unfolds under the timer for a helper at 12:00, 9:00, 6:00 and 3:00 remaining (what to fetch, what to refuse, what to have ready for the hospital) without ever asking the washing person to move, tap-to-call 112 / 108 / 104 on steps 5 and 6, a single final instruction to go to a hospital today, and a help screen with the WHO exposure categories in plain words.
- **Doctor's report** (`#/report`) - built to be read in ten seconds or printed: time since bite (live), the bite, first aid actually given (timed wash, steps gone through), rabies vaccine history, tetanus, allergies, conditions and medicines, patient details, tappable emergency contacts. Always white, no app chrome. Renders even when everything is empty: each missing field prints "Not recorded" with a ruled line to fill by hand. Print / Save as PDF and Copy as text.
- **Medical profile** (`#/profile/medical`) - optional details for a doctor, saved only on the phone: name, age, weight, blood group, previous rabies vaccination, tetanus date, allergies, conditions, medicines, up to three emergency contacts, plus the vaccine tracker (NCDC intramuscular or intradermal schedule, due dates, doses done, RIG given, where the doses are given, calendar export, open-app reminders).
- **LEARN** - 50 myth-vs-fact flip cards, a 45-question quiz (Easy / Medium / Hard) with sourced explanations, a 10-item FAQ, and four verified videos (WHO, CDC, two Indian hospitals) that open on YouTube.
- **PROFILE / SCORES / SETTINGS** - streak, cards learned, 12 text-only achievements, a per-device top-10 leaderboard with share, light / dark / system theme, reset all data, sources.

## Medical safety

Every first-aid step, fact, quiz answer and FAQ is **hard-coded** under `src/data/` from:

- WHO rabies fact sheet
- WHO Expert Consultation on Rabies, third report (TRS 1012, 2018)
- NCDC India, National Guidelines for Rabies Prophylaxis (2019)
- ICMR national survey of animal bites and rabies deaths (2022-23) for India figures
- Government of India ERSS (112) for emergency numbers

Sources are listed per item in `src/data/sources.ts` and shown in the app. Nothing is generated at runtime. Do not let a model write or edit anything in `src/data/`.

The bite record and the doctor's report **record what the patient reports and never interpret it**: no category, no score, no recommendation, no allergy warnings. The doctor decides everything. There is deliberately no symptom checker: symptoms do not change the action (every skin-breaking bite needs the vaccine the same day).

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
- A symptom checker (see above). App accounts, logins, analytics, tracking of any kind.
- Any upload of the medical profile, the bite record or the doctor's report. Those stay on the phone.

## Design

White background, black text, one red (`#d3202f`) used only on the emergency path: the bitten button, the wash timer and the hospital instruction. Dark mode is opt-in and keeps the same red; the doctor's report is white in both themes. No shadows, gradients or decorative icons. Designed for a 360px-wide screen first; the bottom navigation and the timer banner appear only where they belong (the banner only on `#/now` routes, for two hours, dismissable).

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build     # typecheck + production build to dist/
npm run preview   # serve dist/ on http://localhost:4173 (service worker active)
```

## Test

Both scripts need the preview server running and Chrome installed (path is the second argument).

```bash
node scripts/qa.mjs http://localhost:4173/            # fresh profile: red button -> report, banner rules, tel links, medical profile, regression; saves screenshots to qa-shots/
node scripts/check_sw.mjs http://localhost:4173/      # installs the service worker, cuts the network, cold-loads deep routes
```

Nearest hospitals:

```bash
node scripts/qa_geo.mjs http://localhost:4180/
```

Permission granted (Overpass stubbed with a realistic payload), a cached fix with permission since
denied, denial from cold, airplane mode, and both Overpass endpoints returning 504.

Contacts and the confirm popup:

```bash
node scripts/qa_contacts.mjs http://localhost:4180/
```

The empty-state fallback, saving and surviving a real reload, the popup contents, Cancel and Escape
dialling nothing, Call now producing exactly one `tel:` navigation, and the same flow offline with
zero network requests. `tel:` handoffs are observed via `Page.frameRequestedNavigation`, not
inferred. Screenshots:

```bash
node scripts/shots.mjs http://localhost:4180/
```

## Deploy (Vercel)

Import the repo in Vercel or run `vercel` in this folder. `vercel.json` sets the Vite framework, `dist` output, and no-cache headers for `sw.js`. Every push to `main` redeploys.

## Layout

```
src/data/        hard-coded content: nowMode, learnMode, quizzes, faq, videos, achievements, bite, sources
src/hooks/       localStorage, hash routing, timer, theme, learn progress, scores, vaccine tracker, bite record, medical profile, achievements
src/now/         emergency path: entry, triage taps, steps, timer, final screen, hospital finder
src/report/      doctor handoff report (buildReport.ts assembles rows; Report.tsx renders and prints)
src/learn/       cards, FAQ, videos, bookmarks
src/quiz/        quiz home and play
src/profile/     profile, medical profile, vaccination tracker, achievements
src/leaderboard/ per-device top scores
src/components/  header, bottom nav, footer, settings, sources, tel link
scripts/         icon generator (Python/Pillow), headless QA, offline test
```
