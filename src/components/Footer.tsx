import { href } from '../hooks/useRoute'

export default function Footer() {
  return (
    <footer className="ftr">
      <div className="wrap">
        <p>
          <b>First Safety</b> - the first 15 minutes matter most.
        </p>
        <p>
          First-aid steps and facts are hard-coded from WHO and India NCDC guidance.{' '}
          <a href={href('/sources')}>See all sources</a>. This app never generates medical advice.
        </p>
        <p>Works offline. No login. No tracking. Free.</p>
      </div>
    </footer>
  )
}
