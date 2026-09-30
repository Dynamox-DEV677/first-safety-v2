# Sources

Every clinical statement shown on screen in First Safety traces to one of the documents below.
Nothing on screen is written by a model or by the developers. If a statement's source could not be
re-read on the date shown, it is marked `verified: false` in the content files and the app's verify
gate hides it rather than showing it.

Content files: `content/common.json` and `content/animals/*.json`. Each string carries `source`,
`url`, `accessed` and `verified`.

## Documents

| Source | Publisher | Year | URL | Accessed |
|---|---|---|---|---|
| Rabies — Fact sheet | World Health Organization | page dated 17 Sep 2026 | https://www.who.int/news-room/fact-sheets/detail/rabies | 2026-09-29 |
| National Guidelines on Rabies Prophylaxis (National Rabies Control Programme) | National Centre for Disease Control, DGHS, MoHFW, Govt of India | 2015 | https://clinicalestablishments.mohfw.gov.in/sites/default/files/standard-treatment-guidelines/238.pdf | 2026-09-29 |
| National Guidelines for Rabies Prophylaxis | NCDC, MoHFW, Govt of India | 2019 | https://ncdc.mohfw.gov.in/uploads/resource/1769332447_National-Guidelines-for-Rabies-Prophylaxis.pdf | 2026-09-03 (see note 1) |
| WHO Expert Consultation on Rabies, third report — Technical Report Series 1012 | World Health Organization | 2018 | https://www.who.int/publications/i/item/WHO-TRS-1012 | 2026-09-03 (see note 2) |
| Estimates of the burden of human rabies deaths and animal bites in India, 2022–23 | ICMR-NIE, in *The Lancet Infectious Diseases* | 2024 | https://www.thelancet.com/journals/laninf/article/PIIS1473-3099(24)00490-0/abstract | 2026-09-07 |
| Emergency Response Support System — 112 | Ministry of Home Affairs, Govt of India | 2019 | https://112.gov.in | 2026-09-03 |

## Notes on access

1. **NCDC 2019** is published as a scanned-image PDF (41 MB, 52 pages, no text layer). On
   2026-09-29 it could be downloaded but not read by machine. Statements attributed to it were
   taken when the document was read for the v1 build on 2026-09-03 and have not been altered since.
   Where the 2015 edition says the same thing in machine-readable text, the 2015 edition is cited.
2. **WHO TRS 1012** is hosted on WHO IRIS, which refuses automated retrieval. The publication
   landing page (accessed 2026-09-29) carries only the abstract. Statements attributed to TRS 1012
   are those used in v1, read on 2026-09-03.

## Where each source is used

**WHO fact sheet (2026-09-29)** — the 15-minute wash; transmission via bites, scratches and mucosa;
dogs cause up to 99% of human cases; bats as the primary source where dog rabies is controlled;
human-to-human transmission never confirmed; 40% of deaths are children under 15; fatal once
symptoms appear, preventable with prompt PEP.

**NCDC 2015 (2026-09-29)** — do not apply chillies, mustard oil or any other irritant; wash with
plenty of soap and water; do not dress or stitch; suturing to be avoided and delayed if unavoidable;
cauterization no longer recommended; the 10-day observation period is valid for dogs and cats only
and not applicable to other mammals; in India dogs cause about 97% of human rabies, cats 2%,
jackals, mongoose and others 1%; bites by all wild animals treated as category III; domestic
rodents, squirrels, hares and rabbits do not ordinarily require PEP; bat rabies not conclusively
proved in India and exposure to bats does not at present warrant PEP. The "What did the animal do?"
list on the area screen, and the "Type of contact" row on the handover report, use the wording of the
animal-bite patient form in the guideline's annexure (2026-09-30): licks on intact skin; nibbling of
uncovered skin; minor scratches or abrasions without bleeding; licks on broken skin; single or
multiple bites with bleeding; contamination of mucous membrane with saliva. The form groups these
under WHO categories; the app deliberately does not. The report's "10-day observation" row quotes
the same guideline's sentence on dogs and cats.

**NCDC 2019 (2026-09-03)** — the six first-aid steps as shipped in v1; the intramuscular and
intradermal schedules in the vaccine tracker.

**WHO TRS 1012 (2026-09-03)** — the three exposure categories as shown on the help screen; any
direct contact with a bat treated as category III.

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

The app asks where the injury is and prints the answer for the doctor. It shows no statement about
any body site, because the two sources that could be re-read on 2026-09-30 (the WHO fact sheet and
NCDC 2015) contain none. WHO TRS 1012 is understood to treat some sites differently, but it could
not be re-read (note 2), so nothing from it about sites is shown. The area recorded never changes
the first-aid steps and is never turned into a category.

## What has no source, and is therefore not shown

- Any statement that one body site is more or less dangerous than another (see above).

- Bacterial-infection guidance specific to human bites.
- Any livestock-specific statement beyond the general rule that the 10-day observation period does
  not apply to animals other than dogs and cats.
- Any statement about a person's own exposure category, rabies risk, need for immunoglobulin, or
  prognosis. The app never makes these.
