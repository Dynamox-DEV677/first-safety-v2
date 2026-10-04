# Submission — draft

> A starting point. Rewrite it in your own words before you submit: the judges should hear you,
> not a template. Every claim below is true of the code in this repo as of 3 Oct 2026.

## First Safety

**First aid for animal bites that works with no signal, and hands the clinic the facts.**

Try it: **https://first-safety.vercel.app** (add it to your home screen, then switch on aeroplane mode).

Code: **https://github.com/Dynamox-DEV677/first-safety-v2**

### What it refuses to do

First Safety does not diagnose. It does not tell you your WHO exposure category, how likely rabies
is, whether you need immunoglobulin, or that you will be fine. Those are a clinician's decisions,
made with the patient in front of them; a phone that gets them wrong either sends someone home or
floods a clinic. No AI writes a single word that the user reads.

### What it does

It washes, it times, it records, it hands over.

- **Washing first.** The first screen has two buttons. The red one starts WHO's 15-minute soap-and-
  water wash immediately, because most people wash for under a minute and that is the single most
  useful thing anyone can do. The timer keeps true time through a locked screen and a reload.
- **Every mammal.** Dogs cause most rabies in India, but cats, monkeys, rats, bats, mongooses and
  livestock bite too. For each, the app shows what WHO and NCDC India say, word for word, with the
  source and the date it was read. A line no person has reviewed yet is held back and the app says
  so.
- **The handover record.** At the clinic counter the first question is "when did this happen?", and
  the answer is usually "some time back". The app was timing the whole thing, so it already knows.
  One tap on *I'm at the clinic* shows a record built around NCDC's own intake form: time of the
  bite and minutes since, when washing started and for how long, the animal and whether it can be
  traced, the site, and what was and wasn't done. In India wounds often get turmeric, chilli or oil
  before anyone reaches a clinic, so a clean *"No turmeric, chilli, oil or other substance applied"*
  saves the clinician a question; a yes is reported plainly, without judgement. Anything not known
  says **Unknown**, so the clinician knows to ask. It has large type, Hindi labels beside the
  English, copy, share, print, and read aloud in the phone's own voice. It ends: *"This is a record
  of what happened. It contains no medical assessment."*

### Offline is the app

It is built for a clinic waiting room with one bar of signal. Everything runs on the phone: no
account, no server for anyone's data, and the record never leaves the device. Voice input runs a small speech model
(Whisper tiny) on the phone itself. It downloads by itself, once, in the background, the first time
the app is opened with internet, so someone who cannot see the buttons can still speak to it.
Nothing on screen waits for it: until it arrives the buttons and a type box work, and the moment it
does the mic appears and a screen reader announces it. Typing works without it, in English,
Hinglish, Hindi or Tamil spellings. For words the app can't place there is an online helper, on by default, bounded
to 2.5 seconds and a fixed set of answers. It sends only those words, the screen says so, one
switch in Settings turns it off, and the app is complete without it.

### Sources

Every clinical line is traced in [SOURCES.md](https://github.com/Dynamox-DEV677/first-safety-v2/blob/main/SOURCES.md):
the WHO rabies fact sheet, and NCDC India's National Guidelines on Rabies Prophylaxis 2015 and
2019. The 2019 edition exists only as a scanned PDF, so its pages were read with OCR and every
quoted line was checked against the page images. Some lines are accurate but would tell a patient
their exposure category or whether they need treatment (on bats, WHO and NCDC India disagree).
Those are the clinician's calls, so the app leaves them out, and SOURCES.md lists each one with the
reason.

### Tested

There are 73 automated logic tests, plus browser tests on a 360-pixel-wide phone screen that check:

- 7:1 text contrast in light and dark themes
- 64px tap targets
- every screen working with the network cut
- nothing leaving the device during a full run except the online helper's lookup, which carries
  only the typed words
- on a fresh phone, the voice model installing itself while the emergency screen's buttons work,
  then the mic appearing there with no tap, and speech understood with the network cut

It was also tested on a real Android phone, outdoors. *(Do this on 4 Oct, then keep or edit this
line.)*

### Next

On-device voice in Hindi and Tamil. A native-speaker review of the Hindi labels. A verified list of
anti-rabies centres for each state.
