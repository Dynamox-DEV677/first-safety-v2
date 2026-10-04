# Verify before submitting (brief §12)

Run on 1 Oct 2026, and again on 4 Oct after voice began installing itself, against the production build (`npm run build`, served by `vite preview`), in
headless Chrome from a clean profile. Re-run any time with the commands at the bottom.

| | Check | Result | Evidence |
|---|---|---|---|
| ✅ | `git grep -nIE "api[_-]?key\|secret\|token\|password\|AIza\|evo_live"` finds no secrets | Clean. Its only matches are npm package names in `package-lock.json` (`js-tokens`, `@huggingface/tokenizers`) and this row and the next, which name the search and the Gmail app password | A stricter scan for real key formats (Google `AIza…`, GitHub `gh?_…`, `sk-…`, Slack, private keys, JWTs, 16-letter app passwords) finds nothing. The built client bundle contains neither the key's name nor Google's endpoint. |
| ⬜ | Gmail app password revoked | **Yours to do** in Google Account → Security → App passwords | No app password was ever committed: both old repos were checked on 29 Sep and contain only the `xxxx-xxxx-xxxx-xxxx` placeholder. Removing unused app passwords is still good hygiene. |
| ✅ | Gemini key deleted → app fully works | Works | Tested locally with no key, and live on first-safety.vercel.app with one ("my neighbours labrador nipped my ankle" gave dog / leg at 0.95 in 2.0 s; "a cat or a rat" fell back to the two buttons). Without a key, `/api/match` answers 503 without one and the app silently uses its own tap list; offline it never calls it at all. |
| ✅ | Aeroplane mode, fresh install → every screen complete, nothing spinning | 10 of 10 screens complete offline | After one online load the network is cut and every route is cold-loaded: entry, animal, site, facts, wash step, final, help, record, learn, settings. No spinner exists in the app. Real-phone run: 4 Oct. |
| ✅ | 15-minute timer survives the screen locking and backgrounding | Pass | The page is frozen the way Chrome freezes a locked or backgrounded tab: 9 s shown gone against 10 s real. After a full reload it keeps counting. |
| ✅ | Fresh load never restores a finished incident; "New incident" exists | Pass | Recent and unfinished → "Continue". 31 minutes old or finished → the entry screen. "New incident" on the record clears the bite and timer, keeps the medical profile. |
| ✅ | Exactly one clock, tabular mono | One visible at a time | The wash screen shows the big timer; every other emergency screen shows the same clock in the header bar. Both mono, tabular. The wash screen's clock stays in the page because the brief locks the timer (§0). |
| ✅ | Every voice step has a visible tap equivalent | Pass | The animal buttons are always below the voice card. Typing works without the speech model, and every result has "Try again". |
| ✅ | Voice with no model → tap list immediately, no spinner, nothing waits | Pass (rule changed 4 Oct) | The brief said the model must never download during an emergency. On 4 Oct Darshan changed that: voice installs itself in the background once the app is saved for offline, because someone who cannot see the buttons should not have to find Settings first. It comes from this site, not a third party (`public/models`; `qa_voice.mjs` watches the speech worker's own requests too). Fresh phone opened straight onto the voice screen: 12 buttons and the type box at once, *"Voice is downloading. Tap answers for now."*, then the mic appeared on that same screen with no tap and a screen reader hears *"Voice is ready. Speak instead is now above the buttons."* Settings shows progress with Stop; Stop or Remove keeps it from downloading by itself again (after Remove, a reload fetched nothing). |
| ✅ | Report generates offline, copies, reads aloud, says "contains no medical assessment" | Pass | Renders offline. Copy uses the clipboard, with a plain-text fallback. Read aloud uses the browser's own speech (no download); hear it on the phone. The footer is verbatim. |
| ✅ | Report shows "Unknown" rather than omitting or guessing | Pass | 78 logic tests, e.g. an empty record shows Unknown on every row. A bite time is never invented: "Unknown — more than 1 hour before 22:03". |
| ✅ | Nothing is uploaded anywhere | Pass | 420 requests over the full QA run on 4 Oct, none to another host and none to `/api`: Online help is off by default. Switched on, the only request that leaves is `POST /api/match` carrying `{text}`. The record, the profile and audio never leave. Voice's one-time download comes from this site as well; `qa_voice.mjs` watches the speech worker's own requests and finds no other host. |
| ✅ | Every on-screen clinical string traces to a source in `SOURCES.md` | Pass for all v2 content | Every v2 string carries source, URL and date. The NCDC 2019 quotes were OCR'd and checked against the page images. The v1 steps show their sources per step (`src/data/sources.ts`). |
| ✅ | Nothing unverified renders; the verify gate message is unchanged | Pass | Livestock and person each hold one unreviewed line back behind the unchanged gate message. |
| ✅ | Red appears only on urgent actions and DON'T steps | Pass | Red is used for: the wash buttons, the timer, the timer bar in the header, the rule beside the final instruction, and the "FIRST SAFETY" label the brief asks for. The microphone button is no longer red. |
| ✅ | All instruction text ≥ 7:1 contrast, both themes | Pass on 13 screens × 2 themes | Lowest: 8.59 (light), 7.44 (dark). Excluded as not instruction text: the timer digits (numbers), the entry footnote (the brief specifies `--ink-3`) and the entry label. |
| ✅ | No horizontal scroll and no nested scrollers at 360px | Pass at 360 / 390 / 414 | The six-site screen fits without scrolling at 360×740. |
| ✅ | Buttons ≥ 64px tall | Pass | No tap target under 64px on any checked screen; entry buttons 132px, site buttons 84px. |
| ✅ | Wash first (audit, 4 Oct) | Pass | On *Tell me what happened* the first answer (an animal tap or *Looks right*) starts the 15 minutes and opens the wash screen. There, *Answer a few questions while you wash* goes to the next unanswered question; each question screen says *Keep washing while you answer* and has *Back to washing*; *Next* stays outlined, not solid, until the 15 minutes are done; *Reset timer* asks first. |
| ✅ | Sticky buttons never hide the end of a screen | Pass on 6 screens | Scrolled to the end, the last content sits above the bar on the animal, site, facts and step 1 / 3 / 6 screens. The snake notice scrolls itself into view above the bar, with 108 and 112. |
| ⬜ | Tested on a real cheap Android, outdoors, in sunlight | **Yours, 4 Oct** | Live at first-safety.vercel.app. Step-by-step list and QR code: `docs/PHONE-TEST.md`, `docs/first-safety-qr.png`. |

## Decisions to know about

- **The WHO category table is gone from the emergency help screen.** It listed "Category I — No
  vaccine needed", which invites a frightened person to grade their own bite, the line §6 says the
  app must never cross. The help screen now points to the incident record instead.
- **Online help (Gemini) is off by default** — Darshan's decision on 4 Oct, after an audit (it was
  on from 2 Oct). Switched on, it sends only the typed or spoken words the app couldn't place (never
  the report, never audio), and the screen says so under the type box. The app is complete without it.
- **No site-specific instructions.** The brief expected the sources to treat head, neck, face and
  hands differently. The WHO fact sheet, NCDC 2015 and all 52 pages of NCDC 2019 contain no
  patient-facing guidance by site. The only site-specific text is clinician technique for RIG
  injection, which is not shown. The site screen records the site, using NCDC's own reporting
  categories. The facts screen shows the same two sourced lines for every site under "Wherever the
  bite is"; until 4 Oct the heading named the site, which hinted at a grade. Details are in `SOURCES.md`.
- **The voice download is 67 MB on the phone, measured:** model 41.0 MiB plus speech runtime 25.7 MiB.
  The runtime travels compressed (6 MB), so a download uses about 50 MB of data. The screen says
  "about 67 MB", and "up to 67 MB" of mobile data.

## Still to check by a person

- **Hindi labels** on the record (`src/report/buildReport.ts`, `L`) are a draft and need a
  native speaker's eye.
- (Done 2 Oct) Removed from the emergency path because they decide treatment or category: the step-6
  sentence about deep bites needing immunoglobulin, the step-3 clause "after the immunoglobulin
  injection", and five sourced notes (bat ×2, rodent, wild animals, suturing). They are listed in
  `SOURCES.md` under "Read, and deliberately not shown". Nothing was reworded; text was only
  removed.

## Commands

```bash
npm run build
npx vite preview --port 4180 --strictPort
npm run test:logic
node scripts/qa_v2.mjs http://localhost:4180/
node scripts/qa_voice.mjs http://localhost:4180/
node scripts/qa_timer_v2.mjs http://localhost:4180/
```
