import { useState } from 'react'
import SourceNote from '../components/SourceNote'
import { SCHEDULES, buildIcs, toLocalDate, useVaccine, type Schedule } from '../hooks/useVaccine'

const STATUS_LABEL = {
  done: 'Done',
  today: 'Due today',
  overdue: 'Overdue – go today',
  upcoming: 'Upcoming',
} as const

export default function VaccinationTracker() {
  const v = useVaccine()
  const [schedule, setSchedule] = useState<Schedule>('IM')
  const [startDate, setStartDate] = useState<string>(() => toLocalDate(new Date()))

  if (!v.record) {
    return (
      <div>
        <p className="body">
          Log the date of your first dose and the app counts the days for the rest of the course. Your doctor decides
          which schedule you are on – this tracker only keeps the dates.
        </p>
        <label className="lbl" htmlFor="sched">
          Schedule the doctor gave you
        </label>
        <div className="stack" id="sched">
          {SCHEDULES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`btn btn-col ${schedule === s.id ? 'on' : ''}`}
              aria-pressed={schedule === s.id}
              onClick={() => setSchedule(s.id)}
            >
              <span>{s.title}</span>
              <span className="sub" style={schedule === s.id ? { color: 'inherit', opacity: 0.8 } : undefined}>
                Days {s.days.join(', ')}
              </span>
            </button>
          ))}
        </div>
        <label className="lbl" htmlFor="start" style={{ marginTop: 16 }}>
          Date of the first dose (day 0)
        </label>
        <input
          id="start"
          className="inp"
          type="date"
          value={startDate}
          max={toLocalDate(new Date())}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-solid"
          style={{ marginTop: 16 }}
          disabled={!startDate}
          onClick={() => v.start(schedule, startDate)}
        >
          Start tracking
        </button>
        <SourceNote ids={['NCDC_2019']} />
      </div>
    )
  }

  const record = v.record
  const info = SCHEDULES.find((s) => s.id === record.schedule) ?? SCHEDULES[0]

  const exportIcs = () => {
    const blob = new Blob([buildIcs(record)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rabies-vaccine-schedule.ics'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div>
      {v.next ? (
        <div className="notice">
          Next dose: day {v.next.day}, {v.next.dueLabel}
          {v.next.status === 'today' && ' – that is today.'}
          {v.next.status === 'overdue' && ' – overdue. Go today; do not skip it.'}
        </div>
      ) : (
        <div className="notice">Course complete. Well done - keep the record in case a doctor asks.</div>
      )}

      <p className="small" style={{ margin: '0 0 6px' }}>
        {info.title} · {info.note}
      </p>

      {v.doses.map((d) => (
        <div className="dose" key={d.day}>
          <div className="d">
            <b>Day {d.day}</b>
            <span className={`st-${d.status}`}>
              {d.dueLabel} · {STATUS_LABEL[d.status]}
              {d.doneOn ? ` on ${d.doneOn}` : ''}
            </span>
          </div>
          <button
            type="button"
            className={`btn btn-sm ${d.status === 'done' ? 'on' : ''}`}
            aria-pressed={d.status === 'done'}
            onClick={() => v.setDone(d.day, d.status !== 'done')}
          >
            {d.status === 'done' ? 'Done' : 'Mark done'}
          </button>
        </div>
      ))}

      <div className="dose">
        <div className="d">
          <b>Immunoglobulin (RIG)</b>
          <span>Given at the first visit for Category III bites. The doctor decides.</span>
        </div>
        <button type="button" className={`btn btn-sm ${record.rig ? 'on' : ''}`} aria-pressed={record.rig} onClick={() => v.setRig(!record.rig)}>
          {record.rig ? 'Given' : 'Not given'}
        </button>
      </div>

      <label className="lbl" htmlFor="place" style={{ marginTop: 16 }}>
        Where the doses are given (hospital or clinic) - optional, for the doctor&rsquo;s report
      </label>
      <input
        id="place"
        className="inp"
        value={record.place ?? ''}
        onChange={(e) => v.setPlace(e.target.value)}
        placeholder="e.g. Government General Hospital, Chennai"
        autoComplete="off"
      />

      <div className="stack" style={{ marginTop: 16 }}>
        <button type="button" className="btn" onClick={exportIcs}>
          Add doses to my calendar
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => window.confirm('Remove the vaccine record from this phone?') && v.clear()}
        >
          Remove record
        </button>
      </div>
      <SourceNote ids={['NCDC_2019']} />
    </div>
  )
}
