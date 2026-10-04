/**
 * LEARN mode - myths vs facts about rabies.
 *
 * MEDICAL SAFETY: every fact below is hard-coded from the WHO rabies fact sheet, the WHO Expert
 * Consultation on Rabies (TRS 1012, 2018) and India's NCDC National Guidelines for Rabies
 * Prophylaxis (2019). Statistics for India come from the ICMR national survey (2022-23).
 * Nothing here is generated at runtime. Each card lists its sources and the app shows them.
 */
import type { SourceId } from './sources'

export type TopicId = 'transmission' | 'vaccine' | 'access' | 'donts'

export interface Topic {
  id: TopicId
  title: string
  blurb: string
}

export const topics: Topic[] = [
  { id: 'transmission', title: 'How rabies spreads', blurb: 'Which animals, which contacts, and why every bite counts.' },
  { id: 'vaccine', title: 'The vaccine', blurb: 'What it is, when to take it, why delay is dangerous.' },
  { id: 'access', title: 'Getting help in India', blurb: 'Who to call and where the vaccine is.' },
  { id: 'donts', title: 'What not to do', blurb: 'Home remedies and habits that cost lives.' },
]

export interface Myth {
  id: number
  topic: TopicId
  myth: string
  fact: string
  sources: SourceId[]
}

export const myths: Myth[] = [
  // ---------------------------------------------------------------- transmission
  {
    id: 1,
    topic: 'transmission',
    myth: 'Only stray dogs carry rabies.',
    fact: 'Any mammal can carry rabies, including pet dogs and cats that have not been vaccinated. Dogs cause up to 99% of human rabies cases worldwide – pets included.',
    sources: ['WHO_FS'],
  },
  {
    id: 2,
    topic: 'transmission',
    myth: 'You can tell a rabid dog just by looking at it.',
    fact: 'A dog can pass on the virus for days before it shows any sign of illness. Only a laboratory test on the animal can confirm rabies. Treat every bite as a possible exposure.',
    sources: ['WHO_FS', 'WHO_TRS'],
  },
  {
    id: 3,
    topic: 'transmission',
    myth: 'Rabies only spreads through bites.',
    fact: 'It spreads through the saliva of an infected animal – through bites, scratches, or licks on broken skin or on the eyes, nose or mouth.',
    sources: ['WHO_FS'],
  },
  {
    id: 4,
    topic: 'transmission',
    myth: 'A lick on healthy skin can give you rabies.',
    fact: 'Touching or feeding an animal, or being licked on unbroken skin, is WHO Category I – not an exposure. Wash the area anyway. No vaccine is needed.',
    sources: ['WHO_TRS'],
  },
  {
    id: 5,
    topic: 'transmission',
    myth: 'A small scratch cannot cause rabies.',
    fact: 'Minor scratches or nibbles on bare skin, even without bleeding, are WHO Category II exposures. They need the vaccine.',
    sources: ['WHO_TRS'],
  },
  {
    id: 6,
    topic: 'transmission',
    myth: 'Rabies spreads from person to person.',
    fact: 'Person-to-person spread through bites or saliva has never been confirmed. The only documented human-to-human cases came from organ transplants.',
    sources: ['WHO_FS'],
  },
  {
    id: 7,
    topic: 'transmission',
    myth: 'If I feel fine a week later, I am safe.',
    fact: 'Rabies usually takes 2 to 3 months to show symptoms, and can take anywhere from 1 week to 1 year. Feeling fine means nothing. Get the vaccine right after the bite.',
    sources: ['WHO_FS'],
  },
  {
    id: 8,
    topic: 'transmission',
    myth: 'Doctors can cure rabies once symptoms start.',
    fact: 'Once symptoms appear, rabies is almost always fatal. There is no cure. The vaccine prevents it – but only if it is given before symptoms begin.',
    sources: ['WHO_FS'],
  },
  {
    id: 9,
    topic: 'transmission',
    myth: 'Rabies is rare in India.',
    fact: 'India has more rabies deaths than any other country – about a third of the world total. A national ICMR survey estimated 9.1 million animal bites and 5,726 rabies deaths in one year.',
    sources: ['WHO_FS', 'ICMR_2023'],
  },
  {
    id: 10,
    topic: 'transmission',
    myth: 'Only adults get bitten.',
    fact: 'About 40% of people bitten by suspected rabid animals are children under 15. Children also often hide bites, which is why every bite must be reported to an adult.',
    sources: ['WHO_FS'],
  },
  {
    id: 11,
    topic: 'transmission',
    myth: 'Where the bite is does not matter.',
    fact: 'Every bite needs the vaccine, but bites on the head, face, neck and hands are closer to nerves and the brain, so symptoms can come sooner. Those need treatment fastest.',
    sources: ['WHO_FS', 'WHO_TRS'],
  },
  {
    id: 12,
    topic: 'transmission',
    myth: 'Cats, monkeys and cows cannot give rabies.',
    fact: 'All mammals can carry rabies. Dogs are the main source, but bites from cats, monkeys, cattle, jackals and mongooses also need medical care.',
    sources: ['WHO_FS', 'NCDC_2019'],
  },
  {
    id: 13,
    topic: 'transmission',
    myth: 'If the dog is still alive after a few days, I never needed the vaccine.',
    fact: 'If a dog or cat stays healthy for 10 days after the bite, it was not passing on rabies at that time. But the vaccine must start immediately – a doctor may stop the course after those 10 days, never before.',
    sources: ['WHO_TRS', 'NCDC_2019'],
  },
  {
    id: 14,
    topic: 'transmission',
    myth: 'Rabies is a blood disease.',
    fact: 'The virus travels along nerves to the brain and causes inflammation there. That is why late symptoms include fear of water, fear of air, confusion and paralysis.',
    sources: ['WHO_FS'],
  },
  {
    id: 15,
    topic: 'transmission',
    myth: 'Bats are harmless.',
    fact: 'Any direct contact with a bat is a WHO Category III exposure. Bat bites can be tiny and easy to miss. Wash the area and see a doctor.',
    sources: ['WHO_TRS'],
  },

  // ---------------------------------------------------------------- vaccine
  {
    id: 16,
    topic: 'vaccine',
    myth: 'The rabies vaccine is 14 painful injections in the stomach.',
    fact: 'That was the old nerve-tissue vaccine, stopped in India in 2004. Modern vaccines are given in the upper arm – or the thigh in small children – over a short course.',
    sources: ['NCDC_2019'],
  },
  {
    id: 17,
    topic: 'vaccine',
    myth: 'You have months before you need the vaccine.',
    fact: 'Treatment should start as soon as possible – the same day. WHO and NCDC both say post-exposure treatment must begin immediately after the bite.',
    sources: ['WHO_FS', 'NCDC_2019'],
  },
  {
    id: 18,
    topic: 'vaccine',
    myth: 'It is too late for the vaccine after 24 hours.',
    fact: 'Never assume it is too late. The vaccine works best when started immediately, but NCDC says it must still be given to anyone who reports late, because the incubation period can be long.',
    sources: ['NCDC_2019', 'WHO_TRS'],
  },
  {
    id: 19,
    topic: 'vaccine',
    myth: 'One injection is enough.',
    fact: 'A full course is several doses over about a month. In India\'s intramuscular schedule the doses are on days 0, 3, 7, 14 and 28. Missing a dose weakens protection – follow the schedule exactly.',
    sources: ['NCDC_2019'],
  },
  {
    id: 20,
    topic: 'vaccine',
    myth: 'The vaccine is dangerous.',
    fact: 'Modern rabies vaccines are safe and highly effective. Side effects are usually mild – soreness, redness, a mild fever. Rabies itself is fatal.',
    sources: ['WHO_FS', 'WHO_TRS'],
  },
  {
    id: 21,
    topic: 'vaccine',
    myth: 'Pregnant women and babies should not take the vaccine.',
    fact: 'There is no reason to refuse it. Pregnancy, infancy and other illnesses are never reasons to withhold rabies treatment, because the disease is fatal.',
    sources: ['WHO_TRS', 'NCDC_2019'],
  },
  {
    id: 22,
    topic: 'vaccine',
    myth: 'The vaccine alone is enough for a deep bite.',
    fact: 'For Category III exposures – bites that break the skin or bleed – WHO recommends rabies immunoglobulin or monoclonal antibodies injected into and around the wound, as well as the vaccine.',
    sources: ['WHO_TRS'],
  },
  {
    id: 23,
    topic: 'vaccine',
    myth: 'I was vaccinated once, so I never need it again.',
    fact: 'If you were fully vaccinated before, you still need booster doses after a new bite – usually two. You do not need immunoglobulin. Wash the wound and see a doctor.',
    sources: ['WHO_TRS', 'NCDC_2019'],
  },
  {
    id: 24,
    topic: 'vaccine',
    myth: 'A tetanus shot or antibiotics also protect against rabies.',
    fact: 'They may be given for the wound, but neither prevents rabies. Only the rabies vaccine, with immunoglobulin when needed, does.',
    sources: ['NCDC_2019'],
  },
  {
    id: 25,
    topic: 'vaccine',
    myth: 'The vaccine is given in the buttock.',
    fact: 'Never. WHO and NCDC say the gluteal region must not be used – fat there weakens the response. The vaccine goes in the upper arm, or the outer thigh in small children.',
    sources: ['WHO_TRS', 'NCDC_2019'],
  },
  {
    id: 26,
    topic: 'vaccine',
    myth: 'You will feel the virus, so you can wait for symptoms.',
    fact: 'Early symptoms are vague – fever, and pain or tingling at the bite site. By then treatment cannot help. Get the vaccine straight after the bite.',
    sources: ['WHO_FS'],
  },
  {
    id: 27,
    topic: 'vaccine',
    myth: 'Rabies immunoglobulin is experimental.',
    fact: 'Immunoglobulin has been used for decades. WHO also recommends rabies monoclonal antibodies as an alternative, and these are licensed in India.',
    sources: ['WHO_TRS'],
  },
  {
    id: 28,
    topic: 'vaccine',
    myth: 'Vaccinating dogs does not protect people.',
    fact: 'Vaccinating dogs is the most cost-effective way to prevent human rabies deaths. Reaching 70% of the dogs in an area can stop transmission.',
    sources: ['WHO_FS'],
  },
  {
    id: 29,
    topic: 'vaccine',
    myth: 'Only vets need a rabies vaccine in advance.',
    fact: 'Pre-exposure vaccination is recommended for anyone at high risk – veterinarians, animal handlers, laboratory workers, and people in remote areas far from treatment.',
    sources: ['WHO_TRS'],
  },
  {
    id: 30,
    topic: 'vaccine',
    myth: 'You must not bathe or eat certain foods during the vaccine course.',
    fact: 'There are no food or bathing restrictions with the rabies vaccine. Just finish every dose on time.',
    sources: ['NCDC_2019'],
  },

  // ---------------------------------------------------------------- access
  {
    id: 31,
    topic: 'access',
    myth: 'The vaccine is too expensive for ordinary people.',
    fact: 'Under the National Rabies Control Programme, government hospitals and Anti-Rabies Clinics provide the vaccine free of charge in many states. Go to a government facility first.',
    sources: ['NCDC_2019'],
  },
  {
    id: 32,
    topic: 'access',
    myth: 'Only big city hospitals have the vaccine.',
    fact: 'Government district hospitals, medical colleges and many community health centres stock it. Many run dedicated Anti-Rabies Clinics.',
    sources: ['NCDC_2019'],
  },
  {
    id: 33,
    topic: 'access',
    myth: 'There is nobody to call.',
    fact: '112 is India\'s single emergency number, free from any phone. 108 is the free ambulance in most states. 104 is the health helpline in many states.',
    sources: ['GOI_112'],
  },
  {
    id: 34,
    topic: 'access',
    myth: 'A free vaccine means poor quality.',
    fact: 'All rabies vaccines used in India are licensed cell-culture vaccines that must meet the WHO potency standard. Free and paid doses are the same medicine.',
    sources: ['NCDC_2019', 'WHO_TRS'],
  },
  {
    id: 35,
    topic: 'access',
    myth: 'Take the bitten person to a vet.',
    fact: 'The person goes to a hospital for people. If the dog is a pet, its owner should take it to a vet to check its vaccination and watch it for 10 days.',
    sources: ['NCDC_2019', 'WHO_TRS'],
  },
  {
    id: 36,
    topic: 'access',
    myth: 'A hospital will refuse a child who comes alone.',
    fact: 'A bite is an emergency. Go anyway, and call 112 if you cannot reach an adult. Tell your parents as soon as you can.',
    sources: ['GOI_112'],
  },
  {
    id: 37,
    topic: 'access',
    myth: 'You have to pay for the ambulance.',
    fact: '108 ambulances are free where the service runs. If in doubt, call 112 and ask.',
    sources: ['GOI_112'],
  },

  // ---------------------------------------------------------------- donts
  {
    id: 38,
    topic: 'donts',
    myth: 'Chilli, turmeric, oil, lime or mud on the wound protects you.',
    fact: 'NCDC says do not apply irritants. They damage the tissue, do not kill the virus and delay real treatment. Soap and running water for 15 minutes, then antiseptic.',
    sources: ['NCDC_2019'],
  },
  {
    id: 39,
    topic: 'donts',
    myth: 'Bandage the bite tightly to keep germs out.',
    fact: 'Do not bandage tightly or seal the wound. After washing and antiseptic, leave it open or cover it loosely.',
    sources: ['NCDC_2019'],
  },
  {
    id: 40,
    topic: 'donts',
    myth: 'Stitching the wound closed is safest.',
    fact: 'Bite wounds should not be stitched straight away. If stitches are unavoidable, a doctor does them loosely after injecting immunoglobulin.',
    sources: ['NCDC_2019', 'WHO_TRS'],
  },
  {
    id: 41,
    topic: 'donts',
    myth: 'Tie a cloth above the bite to stop the virus.',
    fact: 'Never use a tourniquet. It does not stop the virus and can cause serious damage to the limb.',
    sources: ['NCDC_2019'],
  },
  {
    id: 42,
    topic: 'donts',
    myth: 'Suck, cut or burn the wound to remove the poison.',
    fact: 'Rabies is a virus, not a poison. Cutting, sucking or burning does nothing to it and makes the injury worse.',
    sources: ['NCDC_2019'],
  },
  {
    id: 43,
    topic: 'donts',
    myth: 'Rinsing for a minute is enough.',
    fact: 'WHO and NCDC say wash with soap under running water for at least 15 minutes. Soap breaks the virus\'s outer coat and running water carries it out of the wound.',
    sources: ['WHO_FS', 'NCDC_2019'],
  },
  {
    id: 44,
    topic: 'donts',
    myth: 'No soap, so there is no point washing.',
    fact: 'Wash with running water alone for 15 minutes. It still removes virus. Then find soap or antiseptic.',
    sources: ['WHO_TRS'],
  },
  {
    id: 45,
    topic: 'donts',
    myth: 'If a dog runs at you, run away.',
    fact: 'Running makes a dog chase. Stand still, arms at your sides, look away, and let it lose interest. Then back away slowly. If you are knocked down, curl up and protect your face and neck.',
    sources: ['WHO_FS'],
  },
  {
    id: 46,
    topic: 'donts',
    myth: 'Street dogs that are eating or sleeping are safe to pet.',
    fact: 'Do not touch dogs that are eating, sleeping, hurt, or with puppies – even friendly ones. Never approach a dog you do not know without an adult.',
    sources: ['WHO_FS'],
  },
  {
    id: 47,
    topic: 'donts',
    myth: 'A small bite is not worth telling anyone.',
    fact: 'Children often hide bites because they fear punishment or fear the dog will be harmed. Every bite that breaks the skin needs a doctor today. Tell an adult immediately.',
    sources: ['WHO_FS'],
  },
  {
    id: 48,
    topic: 'donts',
    myth: 'Watch the dog first, then decide about the vaccine.',
    fact: 'Wash and go to the hospital first. Watching the dog happens alongside treatment, and only a doctor can stop the course if the dog stays healthy for 10 days.',
    sources: ['WHO_TRS', 'NCDC_2019'],
  },
  {
    id: 49,
    topic: 'donts',
    myth: 'Killing the dog removes the danger.',
    fact: 'Your exposure does not change. You still need the full course. If a pet dog can be watched for 10 days instead, that helps the doctor decide.',
    sources: ['WHO_TRS', 'NCDC_2019'],
  },
  {
    id: 50,
    topic: 'donts',
    myth: 'Ash, cow dung or herbs will dry the wound.',
    fact: 'They add bacteria and tetanus risk and do nothing against rabies. NCDC lists soil, herbs and similar substances among the things never to apply.',
    sources: ['NCDC_2019'],
  },
]

export function mythsByTopic(topic: string): Myth[] {
  return myths.filter((m) => m.topic === topic)
}
