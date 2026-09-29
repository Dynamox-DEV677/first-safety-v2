import { href } from '../hooks/useRoute'

export default function NotFound() {
  return (
    <div className="page-main">
      <h1 className="title">Page not found</h1>
      <div className="stack">
        <a className="btn btn-solid" href={href('/')}>
          Back to start
        </a>
      </div>
    </div>
  )
}
