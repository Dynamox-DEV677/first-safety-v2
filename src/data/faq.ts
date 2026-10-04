/**
 * Frequently asked questions. Answers are hard-coded from WHO and NCDC guidance; sources per item.
 */
import type { SourceId } from './sources'

export interface Faq {
  id: string
  q: string
  a: string
  sources: SourceId[]
}

export const faqs: Faq[] = [
  {
    id: 'how-soon',
    q: 'How soon after a bite do I need the vaccine?',
    a: 'As soon as possible – the same day. There is no safe waiting period. If you are already late by days or weeks, it is still not too late: NCDC says treatment must be given to anyone who reports late, because rabies can take months to appear.',
    sources: ['WHO_FS', 'NCDC_2019'],
  },
  {
    id: 'free',
    q: 'Is the vaccine free?',
    a: 'It depends on the state. Under the National Rabies Control Programme many state governments give the anti-rabies vaccine free at government hospitals and Anti-Rabies Clinics. Call 104 or ask at the nearest government hospital. Never skip the vaccine because of cost – ask for the government facility.',
    sources: ['NCDC_2019'],
  },
  {
    id: 'doses',
    q: 'How many doses are there?',
    a: 'A full course is several doses over about a month. India\'s intramuscular schedule is days 0, 3, 7, 14 and 28; the intradermal schedule is days 0, 3, 7 and 28. The doctor chooses the schedule. Do not miss or delay a dose.',
    sources: ['NCDC_2019'],
  },
  {
    id: 'vaccinated-dog',
    q: 'The dog is vaccinated. Do I still need the vaccine?',
    a: 'Yes – start today. If the dog can be watched and stays healthy for 10 days, the doctor may stop the course. Only a doctor decides that, and only after treatment has started.',
    sources: ['WHO_TRS', 'NCDC_2019'],
  },
  {
    id: 'stray',
    q: 'I cannot find the dog that bit me. What now?',
    a: 'Start treatment today and complete the full course. Tell the doctor you could not identify the dog and whether it was behaving strangely.',
    sources: ['WHO_TRS', 'NCDC_2019'],
  },
  {
    id: 'side-effects',
    q: 'Does the vaccine have side effects?',
    a: 'Modern cell-culture vaccines are safe. Side effects are usually mild – soreness or redness where it was given, sometimes a mild fever or headache. Rabies itself is fatal.',
    sources: ['WHO_FS', 'WHO_TRS'],
  },
  {
    id: 'who-can',
    q: 'Can pregnant women, babies or sick people take it?',
    a: 'Yes. Pregnancy, infancy and other illnesses are never reasons to withhold rabies treatment. There are also no food or bathing restrictions during the course.',
    sources: ['WHO_TRS', 'NCDC_2019'],
  },
  {
    id: 'rig',
    q: 'What is rabies immunoglobulin (RIG)? Do I need it?',
    a: 'RIG gives ready-made antibodies injected into and around the wound, protecting you while the vaccine builds your own immunity. WHO recommends it for Category III exposures – bites that break the skin or bleed, licks on wounds or on the eyes, nose or mouth, and bat contact. Monoclonal antibodies are an alternative. The doctor decides.',
    sources: ['WHO_TRS'],
  },
  {
    id: 'cure',
    q: 'Can rabies be treated once symptoms start?',
    a: 'No. Once symptoms appear, rabies is almost always fatal. That is why the first 15 minutes of washing and the vaccine on the same day matter so much.',
    sources: ['WHO_FS'],
  },
  {
    id: 'dog-approaches',
    q: 'What should I do if a dog runs at me?',
    a: 'Do not run – running makes a dog chase. Stand still with your arms at your sides, look away, and let it lose interest, then back away slowly. If you are knocked down, curl up and protect your face and neck. Do not touch dogs that are eating, sleeping, hurt or with puppies.',
    sources: ['WHO_FS'],
  },
]
