/**
 * Sources for every medical statement in First Safety.
 * Medical content is HARD-CODED from these documents. Nothing is generated at runtime.
 * If you change any first-aid text, re-check it against the source listed on that item.
 */
export type SourceId = 'WHO_FS' | 'WHO_TRS' | 'NCDC_2019' | 'ICMR_2023' | 'GOI_112'

export interface Source {
  id: SourceId
  short: string
  title: string
  publisher: string
  year: string
  url: string
}

export const SOURCES: Record<SourceId, Source> = {
  WHO_FS: {
    id: 'WHO_FS',
    short: 'WHO fact sheet',
    title: 'Rabies - Fact sheet',
    publisher: 'World Health Organization',
    year: 'updated regularly',
    url: 'https://www.who.int/news-room/fact-sheets/detail/rabies',
  },
  WHO_TRS: {
    id: 'WHO_TRS',
    short: 'WHO TRS 1012',
    title: 'WHO Expert Consultation on Rabies, third report (Technical Report Series 1012)',
    publisher: 'World Health Organization',
    year: '2018',
    url: 'https://www.who.int/publications/i/item/WHO-TRS-1012',
  },
  NCDC_2019: {
    id: 'NCDC_2019',
    short: 'NCDC India 2019',
    title: 'National Guidelines for Rabies Prophylaxis, 2019 (National Rabies Control Programme)',
    publisher: 'National Centre for Disease Control, Ministry of Health & Family Welfare, Government of India',
    year: '2019',
    url: 'https://ncdc.mohfw.gov.in',
  },
  ICMR_2023: {
    id: 'ICMR_2023',
    short: 'ICMR survey 2022-23',
    title: 'National survey of animal bites and human rabies deaths in India, 2022-23',
    publisher: 'Indian Council of Medical Research',
    year: '2022-23',
    url: 'https://www.icmr.gov.in',
  },
  GOI_112: {
    id: 'GOI_112',
    short: 'ERSS 112',
    title: 'Emergency Response Support System - single emergency number 112',
    publisher: 'Ministry of Home Affairs, Government of India',
    year: '2019',
    url: 'https://112.gov.in',
  },
}

export const SOURCE_LIST: Source[] = Object.values(SOURCES)

export function sourceLabel(ids: SourceId[]): string {
  return ids.map((id) => SOURCES[id].short).join(' / ')
}
