# Verify before submitting (brief §12)

Run on 1 Oct 2026 against the production build (`npm run build`, served by `vite preview`), in
headless Chrome from a clean profile. Re-run any time with the commands at the bottom.

| | Check | Result | Evidence |
|---|---|---|---|
| ✅ | `git grep -nIE "api[_-]?key\|secret\|token\|password\|AIza\|evo_live"` prints nothing | CLEAN outside `package-lock.json`, whose only matches are npm package names (`js-tokens`, `@huggingface/tokenizers`) | A stricter scan for real key formats (Google `AIza…`, GitHub `gh?_…`, `sk-…`, Slack, private keys, JWTs, 16-letter app passwords) finds nothing. The built client bundle contains neither the key's name nor Google's endpoint. |
| ⬜ | Gmail app password revoked | **Yours to do** in Google Account → Security → App passwords | No app password was ever committed: both old repos were checked on 29 Sep and contain only the `xxxx-xxxx-xxxx-xxxx` placeholder. Removing unused app passwords is still good hygiene. |
| ✅ | Gemini key deleted → app fully works | Works | This build has no key. `/api/match` answers 503 without one; with "Online help" off (the default) the app never calls it. |
| ✅ | Aeroplane mode, fresh install → every screen complete, nothing spinning | 10 of 10 screens complete offline | After one online load the network is cut and every route is cold-loaded: entry, animal, site, facts, wash step, final, help, record, learn, settings. No spinner exists in the app. Real-phone run: 4 Oct. |
| ✅ | 15-minute timer survives the screen locking and backgrounding | Pass | The page is frozen the way Chrome freezes a locked or backgrounded tab: 9 s shown gone against 10 s real. After a full reload it keeps counting. |
| ✅ | Fresh load never restores a finished incident; "New incident" exists | Pass | Recent and unfinished → "Continue". 31 minutes old or finished → the entry screen. "New incident" on the record clears the bite and timer, keeps the medical profile. |
| ✅ | Exactly one clock, tabular mono | One visible at a time | The wash screen shows the big timer; every other emergency screen shows the same clock in the header bar. Both mono, tabular. The wash screen's clock stays in the page because the brief locks the timer (§0). |
| ✅ | Every voice step has a visible tap equivalent | Pass | The animal buttons are always below the voice card. Typing works without the speech model, and every result has "Try again". |
| ✅ | Voice button with no model → tap list immediately, no download, no spinner | Pass | Shows *"Voice needs a one-time download. Tap answers for now."*; zero network requests on that screen. The download is offered on the LEARN home and in Settings, with a mobile-data warning. |
| ✅ | Report generates offline, copies, reads aloud, says "contains no medical assessment" | Pass | Renders offline. Copy uses the clipboard, with a plain-text fallback. Read aloud uses the browser's own speech (no download); hear it on the phone. The footer is verbatim. |
| ✅ | Report shows "Unknown" rather than omitting or guessing | Pass | 70 logic tests, e.g. an empty record shows Unknown on every row. A bite time is never invented: "Unknown — more than 1 hour before 22:03". |
| ✅ | Nothing is uploaded anywhere | Pass | 361 requests over the full QA run, all same-origin GETs; none to `/api`, none to another host. |
| ✅ | Every on-screen clinical string traces to a source in `SOURCES.md` | Pass for all v2 content | Every v2 string carries source, URL and date. The NCDC 2019 quotes were OCR'd and checked against the page images. The v1 steps show their sources per step (`src/data/sources.ts`). |
| ✅ | Nothing unverified renders; the verify gate message is unchanged | Pass | Livestock and person each hold one unreviewed line back behind the unchanged gate message. |
| ✅ | Red appears only on urgent actions and DON'T steps | Pass | Red is used for: the wash buttons, the timer, the timer bar in the header, the rule beside the final instruction, and the "FIRST SAFETY" label the brief asks for. The microphone button is no longer red. |
| ✅ | All instruction text ≥ 7:1 contrast, both themes | Pass on 13 screens × 2 themes | Lowest: 8.59 (light), 7.44 (dark). Excluded as not instruction text: the timer digits (numbers), the entry footnote (the brief specifies `--ink-3`) and the entry label. |
| ✅ | No horizontal scroll and no nested scrollers at 360px | Pass at 360 / 390 / 414 | The six-site screen fits without scrolling at 360×740. |
| ✅ | Buttons ≥ 64px tall | Pass | No tap target under 64px on any checked screen; entry buttons 132px, site buttons 84px. |
| ⬜ | Tested on a real cheap Android, outdoors, in sunlight | **Yours, 4 Oct** | Needs a deployed URL. |

## Decisions to know about

- **The WHO category table is gone from the emergency help screen.** It listed "Category I — No
  vaccine needed", which invites a frightened person to grade their own bite, the line §6 says the
  app must never cross. The help screen now points to the incident record instead.
- **Online help (Gemini) is off by default.** When on, it sends the person's typed or spoken words
  (never the report, never audio) to Google, so it is a choice, not a default. The brief makes the
  layer optional; the app is complete without it.
- **No site-specific instructions.** The brief expected the sources to treat head, neck, face and
  hands differently. The WHO fact sheet, NCDC 2015 and all 52 pages of NCDC 2019 contain no
  patient-facing guidance by site. The only site-specific text is clinician technique for RIG
  injection, which is not shown. The site screen records the site, using NCDC's own reporting
  categories, and shows WHO's "location of virus entry" line. Details are in `SOURCES.md`.
- **The voice download is about 70 MB, not 40 MB.** The model is 40 MB; the speech runtime it needs
  adds about 27 MB. The screen says 70.

## Still to check by a person

- **Hindi labels** on the record (`src/report/buildReport.ts`, `L`) are a draft and need a
  native speaker's eye.
- **One v1 line sits close to §6's rule:** step 6 says "Deep bites also need rabies immunoglobulin
  injected around the wound - the doctor decides." It describes a rule, not this patient, and it
  is v1 medical text, so it was not edited here. Decide whether to keep it.

## Commands

```bash
npm run build
npx vite preview --port 4180 --strictPort
npm run test:logic
node scripts/qa_v2.mjs http://localhost:4180/
node scripts/qa_voice.mjs http://localhost:4180/
node scripts/qa_timer_v2.mjs http://localhost:4180/
```
