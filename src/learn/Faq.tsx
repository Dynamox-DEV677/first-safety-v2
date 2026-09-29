import { faqs } from '../data/faq'
import { sourceLabel } from '../data/sources'
import { href } from '../hooks/useRoute'

export default function Faq() {
  return (
    <div className="page-main">
      <p className="eyebrow">Learn · FAQ</p>
      <h1 className="title">Questions people ask</h1>
      <div>
        {faqs.map((f) => (
          <details className="faq" key={f.id}>
            <summary>{f.q}</summary>
            <p className="body">{f.a}</p>
            <p className="small" style={{ margin: '0 0 14px' }}>
              Source: {sourceLabel(f.sources)}
            </p>
          </details>
        ))}
      </div>
      <p className="small" style={{ marginTop: 20 }}>
        Answers are hard-coded from WHO and NCDC guidance. <a href={href('/sources')}>All sources</a>.
      </p>
    </div>
  )
}
