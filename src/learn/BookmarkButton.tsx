interface Props {
  on: boolean
  onToggle: () => void
}

export default function BookmarkButton({ on, onToggle }: Props) {
  return (
    <button type="button" className={`btn ${on ? 'on' : ''}`} aria-pressed={on} onClick={onToggle}>
      {on ? 'Bookmarked' : 'Bookmark'}
    </button>
  )
}
