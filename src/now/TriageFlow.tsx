import type { ReactNode } from 'react'
import {
  BITE_TIMES,
  CLOSURES,
  CONTACT_TYPES,
  SUBSTANCES,
  YES_NO_UNSURE,
  type Answer,
  type BiteRecord,
} from '../data/bite'
import type { DogKnown } from '../data/nowMode'
import { SITUATION } from '../content'
import { VerifyGate } from '../components/Sourced'
import { href, navigate } from '../hooks/useRoute'
import { writeLS } from '../hooks/useLocalStorage'
import { setBiteEstimate, toggleBiteListItem, updateBiteRecord, useBiteRecord } from '../hooks/useBiteRecord'
import { useTimer } from '../hooks/useTimer'
import WashingNote from './WashingNote'

/**
 * "A few facts for the clinic" - every answer optional, every answer only recorded for the handover
 * report. None of them changes the first-aid steps. The sourced lines that appear here are chosen by
 * the facts (late start, saliva in the eyes, something put on the wound), never by a judgement.
 * Washing stays one tap away the whole time.
 */
export default function TriageFlow() {
  const bite = useBiteRecord()
  const timer = useTimer()
  const b = bite ?? undefined

  const set = (patch: Partial<BiteRecord>) => updateBiteRecord(patch)
  const toggle1 = <K extends keyof BiteRecord>(key: K, v: BiteRecord[K]) =>
    set({ [key]: b?.[key] === v ? '' : v } as Partial<BiteRecord>)

  const setKnown = (v: Answer) => {
    const next = b?.animalKnown === v ? '' : v
    set({ animalKnown: next, ...(next === 'no' ? { animalVaccinated: '' } : {}) })
    // The older steps read this key for the "About the animal" note on step 6.
    writeLS<DogKnown | null>('fs.triage', next === 'yes' ? 'known' : next === 'no' ? 'unknown' : null)
  }

  const washNow = () => {
    if (timer.status === 'idle') timer.start()
    navigate('/now/step/1')
  }

  const late = !!b?.biteEstimate && b.biteEstimate !== 'now'
  const mucosa = !!b?.contact.includes('saliva-mucosa')
  const applied = !!b?.substances.some((id) => SUBSTANCES.find((s) => s.id === id)?.irritant)

  return (
    <div className="page-main facts" style={{ display: 'flex', flexDirection: 'column' }}>
      <p className="eyebrow">For the clinic · all optional</p>
      <h1 className="title">A few facts</h1>
      <WashingNote />
      <p className="body">Saved for the handover report. They do not change what to do next.</p>

      {/* The same lines for every site, under a heading that names none: the sources give no
          site-specific first aid, and a site-named heading would hint at a grade (SOURCES.md). */}
      <VerifyGate notes={SITUATION.site} title="Wherever the bite is" />

      <Q title="When did it happen?">
        <div className="grid2" role="group" aria-label="When did it happen" data-q="when">
          {BITE_TIMES.map((t) => (
            <Opt key={t.id} on={b?.biteEstimate === t.id} onClick={() => setBiteEstimate(b?.biteEstimate === t.id ? '' : t.id)}>
              {t.label}
            </Opt>
          ))}
        </div>
        {late && <VerifyGate notes={SITUATION.late} />}
      </Q>

      <Q title="What did the animal do?" hint="Tap all that apply.">
        <div className="grid2" role="group" aria-label="What did the animal do" data-q="contact">
          {CONTACT_TYPES.map((c) => (
            <Opt key={c.id} on={!!b?.contact.includes(c.id)} onClick={() => toggleBiteListItem('contact', c.id)}>
              {c.label}
            </Opt>
          ))}
        </div>
        {mucosa && <VerifyGate notes={SITUATION.mucosa} />}
      </Q>

      <Q title="Did it break the skin?">
        <YesNo q="broke" value={b?.brokeSkin ?? ''} onPick={(v) => toggle1('brokeSkin', v)} />
      </Q>

      <Q title="Is it bleeding?">
        <YesNo q="bleeding" value={b?.bleeding ?? ''} onPick={(v) => toggle1('bleeding', v)} />
      </Q>

      <Q title="Can the animal be found again?">
        <div className="seg" role="group" aria-label="Can the animal be found again" data-q="known">
          <Opt on={b?.animalKnown === 'yes'} onClick={() => setKnown('yes')} sub="A pet, or one I can find">
            Yes
          </Opt>
          <Opt on={b?.animalKnown === 'no'} onClick={() => setKnown('no')} sub="A stray or wild one">
            No
          </Opt>
          <Opt on={b?.animalKnown === 'unsure'} onClick={() => setKnown('unsure')}>
            Not sure
          </Opt>
        </div>
      </Q>

      {b?.animalKnown === 'yes' && (
        <Q title="Is the animal vaccinated against rabies?">
          <YesNo q="animal-vaccinated" value={b.animalVaccinated} onPick={(v) => toggle1('animalVaccinated', v)} />
        </Q>
      )}

      <Q title="Has anything been put on the wound?" hint="Tap all that apply.">
        <div className="grid2" role="group" aria-label="Put on the wound" data-q="substances">
          {SUBSTANCES.map((s) => (
            <Opt key={s.id} on={!!b?.substances.includes(s.id)} onClick={() => toggleBiteListItem('substances', s.id)}>
              {s.label}
            </Opt>
          ))}
        </div>
        {applied && <VerifyGate notes={SITUATION.applied} />}
      </Q>

      <Q title="Is the wound covered or closed?">
        <div className="seg" role="group" aria-label="Covered or closed" data-q="closure">
          {CLOSURES.map((c) => (
            <Opt key={c.id} on={b?.closure === c.id} onClick={() => toggle1('closure', c.id)}>
              {c.label}
            </Opt>
          ))}
        </div>
      </Q>

      <Q title="Who was bitten?">
        <div className="seg" role="group" aria-label="Who was bitten" data-q="patient">
          <Opt on={b?.patient === 'me'} onClick={() => toggle1('patient', 'me')} sub="This phone's owner">
            Me
          </Opt>
          <Opt on={b?.patient === 'other'} onClick={() => toggle1('patient', 'other')}>
            Someone else
          </Opt>
        </div>
      </Q>

      <Q title="Rabies vaccine before?">
        <YesNo q="prior-rabies" value={b?.priorRabies ?? ''} onPick={(v) => toggle1('priorRabies', v)} />
      </Q>

      <Q title="Tetanus vaccine before?">
        <YesNo q="prior-tetanus" value={b?.priorTetanus ?? ''} onPick={(v) => toggle1('priorTetanus', v)} />
      </Q>

      <div className="actions">
        <div className="btn-row">
          <a className="btn btn-ghost" href={href('/report')}>
            Show record
          </a>
          <button type="button" className="btn btn-red" onClick={washNow}>
            {timer.status === 'idle' ? 'Start washing now' : 'Back to washing'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Q({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="q">
      <h2 className="q-title">{title}</h2>
      {hint && <p className="q-hint">{hint}</p>}
      {children}
    </section>
  )
}

function Opt({ on, onClick, sub, children }: { on: boolean; onClick: () => void; sub?: string; children: ReactNode }) {
  return (
    <button type="button" className={`btn ${sub ? 'btn-col' : ''} ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick}>
      <span>{children}</span>
      {sub && <span className="sub">{sub}</span>}
    </button>
  )
}

function YesNo({ q, value, onPick }: { q: string; value: Answer; onPick: (v: Answer) => void }) {
  return (
    <div className="seg" role="group" data-q={q}>
      {YES_NO_UNSURE.map((o) => (
        <Opt key={o.id} on={value === o.id} onClick={() => onPick(o.id)}>
          {o.label}
        </Opt>
      ))}
    </div>
  )
}
