/**
 * Educational videos. These are LINKS that open on YouTube, not embedded players:
 * embedding would load Google scripts and cookies into an app used by children, and
 * would not work offline. Each entry was verified to exist via YouTube's oEmbed API on
 * 2026-09-03 (title and channel name are copied from that response).
 *
 * First Safety did not produce these videos. Watch each one before publishing the app,
 * and remove any that you are not happy with.
 */
export interface Video {
  id: string
  /** Title as published on YouTube. */
  title: string
  /** Channel name as published on YouTube. */
  channel: string
  /** Why it is here. */
  about: string
  topic: 'technique' | 'myths' | 'emergency'
  verified: string
}

export const videos: Video[] = [
  {
    id: 'Fft42pwOR2E',
    title: "WHO's Science in 5 - Rabies: Protect yourself and your pets",
    channel: 'World Health Organization (WHO)',
    about: 'WHO experts explain what rabies is, why it is fatal and how it is prevented.',
    topic: 'myths',
    verified: '2026-09-03',
  },
  {
    id: 'EDiZu8E_vDw',
    title: 'What To Do After a Dog Bite? Rabies First Aid & Treatment Guide',
    channel: 'Sundaram Medical Foundation',
    about: 'A Chennai hospital walks through first aid and treatment after a dog bite.',
    topic: 'technique',
    verified: '2026-09-03',
  },
  {
    id: 'lYQP0oX8zaU',
    title: 'Dog Bite: First Aid & Rabies Prevention | Dr. Ajay Kumar Mishra',
    channel: 'Narayana Health',
    about: 'An Indian doctor on what to do in the first minutes and why the vaccine matters.',
    topic: 'emergency',
    verified: '2026-09-03',
  },
  {
    id: 'DWR1d67DXzU',
    title: 'Rabies Prevention in the United States',
    channel: 'Centers for Disease Control and Prevention (CDC)',
    about: 'How rabies spreads and how vaccination of animals and people prevents it.',
    topic: 'myths',
    verified: '2026-09-03',
  },
]

export function videoUrl(v: Video): string {
  return `https://www.youtube.com/watch?v=${v.id}`
}

export const VIDEO_TOPICS: Record<Video['topic'], string> = {
  technique: 'Wound washing and first aid',
  myths: 'What rabies is and vaccine facts',
  emergency: 'Emergency care',
}
