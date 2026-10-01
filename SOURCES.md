# Sources

Every clinical statement shown on screen in First Safety traces to one of the documents below.
Nothing on screen is written by a model or by the developers. If a statement's source could not be
re-read on the date shown, it is marked `verified: false` in the content files and the app's verify
gate hides it rather than showing it.

Content files: `content/common.json`, `content/situations.json` and `content/animals/*.json`. Each
string carries `source`, `url`, `accessed` and `verified`. The original six first-aid steps (v1)
live in `src/data/nowMode.ts` with their sources listed per step and shown in the app.

## Documents

| Source | Publisher | Year | URL | Accessed |
|---|---|---|---|---|
| Rabies — Fact sheet | World Health Organization | page dated 17 Sep 2026 | https://www.who.int/news-room/fact-sheets/detail/rabies | 2026-09-29, 2026-09-30 |
| National Guidelines on Rabies Prophylaxis (National Rabies Control Programme) | National Centre for Disease Control, DGHS, MoHFW, Govt of India | 2015 | https://clinicalestablishments.mohfw.gov.in/sites/default/files/standard-treatment-guidelines/238.pdf | 2026-09-29, 2026-10-01 |
| National Guidelines for Rabies Prophylaxis | NCDC, MoHFW, Govt of India | 2019 | https://ncdc.mohfw.gov.in/uploads/resource/1769332447_National-Guidelines-for-Rabies-Prophylaxis.pdf | 2026-09-03, 2026-10-01 (see note 1) |
| WHO Expert Consultation on Rabies, third report — Technical Report Series 1012 | World Health Organization | 2018 | https://www.who.int/publications/i/item/WHO-TRS-1012 | 2026-09-03 (see note 2) |
| Estimates of the burden of human rabies deaths and animal bites in India, 2022–23 | ICMR-NIE, in *The Lancet Infectious Diseases* | 2024 | https://www.thelancet.com/journals/laninf/article/PIIS1473-3099(24)00490-0/abstract | 2026-09-07 |
| Emergency Response Support System — 112 | Ministry of Home Affairs, Govt of India | 2019 | https://112.gov.in | 2026-09-03 |

## Notes on access

1. **NCDC 2019** is published as a scanned-image PDF (41 MB, 52 pages, no text layer). On
   2026-10-01 all 52 pages were rendered and read with the Windows built-in OCR engine, and every
   line the app quotes was then checked word for word against the page images (pp. 6–7 of the
   printed document, pages 16–17 of the PDF). The page number is part of each citation.
2. **WHO TRS 1012** is hosted on WHO IRIS, which refuses automated retrieval. The publication
   landing page carries only the abstract. Statements attributed to TRS 1012 are those used in v1,
   read on 2026-09-03.

## Where each source is used

**WHO fact sheet** — the 15-minute wash; transmission via bites, scratches and mucosa; dogs cause
up to 99% of human cases; bats as the primary source where dog rabies is controlled; human-to-human
transmission never confirmed; 40% of deaths are children under 15; fatal once symptoms appear,
preventable with prompt PEP; and (2026-09-30) "the incubation period … may vary from one week to
one year, depending on factors such as the location of virus entry and the viral load", shown on
the facts screen once the bite site is known.

**NCDC 2015** — do not apply chillies, mustard oil or any other irritant; wash with plenty of soap
and water; do not dress or stitch; suturing to be avoided and delayed if unavoidable; cauterization
no longer recommended; the 10-day observation period is valid for dogs and cats only and not
applicable to other mammals; in India dogs cause about 97% of human rabies, cats 2%, jackals,
mongoose and others 1%; bites by all wild animals treated as category III; domestic rodents,
squirrels, hares and rabbits do not ordinarily require PEP; bat rabies not conclusively proved in
India and exposure to bats does not at present warrant PEP.

**NCDC 2015, Annexure 2 — "Proforma for management of animal bite case at an antirabies
centre/clinic (ARC)"** (2026-10-01). This is the clinic's own intake form, and the handover report
is built around it: date and time of bite; interval between bite and reporting; site of bite;
species (dog/cat/monkey/mongoose/others); pet/stray/wild; the animal's vaccination status; type of
exposure (licks on intact skin; nibbling of uncovered skin; minor scratches or abrasions without
bleeding; licks on broken skin; single or multiple bites with bleeding; contamination of mucous
membrane with saliva); and "remedy taken before coming to anti-rabies centre/clinic" (none; washed
with water; washed with soap and water; antiseptic; oil/salt/chilies/lime/herbs/other). The form
groups the exposure types under WHO categories; the app deliberately does not. The report's
"10-day observation" row uses the guideline's own rule on dogs and cats.

**NCDC 2019** (2026-09-03 for v1; 2026-10-01 by OCR, see note 1) — the six first-aid steps as shipped
in v1; the intramuscular and intradermal schedules in the vaccine tracker; and, verbatim, on the
facts screen when the answers make them relevant:
- p. 6, "Washing of wounds is desirable up to 15 minutes … wound management must be performed even
  if the patient reports late." — shown once the bite site is known.
- p. 7, "It should be noted that immediate washing of wounds is a priority. However, the victim
  should not be deprived of the benefits of wound management … (in case the victim reported late)."
  — shown when the bite was not just now.
- p. 7, "Eyes and mucosa, if exposed, should be thoroughly rinsed with water." — shown when saliva
  reached the eyes, nose or mouth.
- p. 7, "The application of irritants (like chilies, oil, turmeric, lime, salt, etc.) is unnecessary
  and damaging. In case irritants have been applied on the wounds, gentle washing with soap or
  detergent should be done …" — shown when something was put on the wound.
- pp. 29–30 (PDF pages 39–40), the programme's reporting formats record "Site of Bite on Body
  (Extremities / Trunk / Head-Neck Face / Back)" — the six site options map onto these.

Page numbers are the printed ones; the PDF runs ten pages ahead (printed p. 6 is PDF page 16).

**WHO TRS 1012 (2026-09-03)** — any direct contact with a bat treated as category III (shown, with
NCDC's disagreement, in the bat notes).

**ICMR-NIE 2022–23 (2026-09-07)** — 9.1 million animal bites and 5,726 rabies deaths a year in
India; 79.5% of dog-bite victims received at least one vaccine dose, about 40% completed the course,
about 5% received immunoglobulin.

## Where sources disagree

The app shows both statements verbatim and does not choose. That decision belongs to the clinician
with the patient in front of them.

- **Bats.** WHO TRS 1012 treats any direct contact with a bat as category III. NCDC India (2015)
  states bat rabies has not been conclusively proved in India and exposure to bats does not at
  present warrant PEP.
- **Rodents.** NCDC India (2015) states exposure to domestic rodents, squirrels, hares and rabbits
  does not ordinarily require PEP. WHO's fact sheet does not single rodents out.

## Area of injury

The app asks "Where is the bite?" once, records the answer for the handover report, and shows what
the sources say about location. Read for this on 2026-09-30 and 2026-10-01: the WHO fact sheet, NCDC
2015 and NCDC 2019 (all 52 pages, by OCR). None of them gives a patient-facing instruction that
depends on the body site. The only location statements are:

- WHO: the incubation period depends on "the location of virus entry" — shown for every site.
- NCDC 2019, pp. 8 and 10: fingertips, toes, ear lobes, the nose and around the eye "can be safely
  injected with RIG" with care — **clinician technique, deliberately not shown**, because it reads
  as a treatment recommendation.

Also deliberately not shown, though verbatim in NCDC 2019 p. 7: "A bleeding wound at any site
indicates severe exposure and should be infiltrated with RIG." That is the clinician's call about
immunoglobulin, which the app never makes (v2 brief, §6). WHO TRS 1012 may treat some sites
differently, but it could not be re-read (note 2), so nothing from it about sites is shown. The site
never changes the first-aid steps and is never turned into a category.

## What has no source, and is therefore not shown

- Any statement that one body site is more or less dangerous than another (see above).
- Bacterial-infection guidance specific to human bites.
- Any livestock-specific statement beyond the general rule that the 10-day observation period does
  not apply to animals other than dogs and cats.
- Any statement about a person's own exposure category, rabies risk, need for immunoglobulin, or
  prognosis. The app never makes these.
