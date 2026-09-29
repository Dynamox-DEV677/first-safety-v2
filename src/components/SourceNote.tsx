import { sourceLabel, type SourceId } from '../data/sources'
import { href } from '../hooks/useRoute'

/** The visible citation under every medical statement. */
export default function SourceNote({ ids }: { ids: SourceId[] }) {
  return (
    <p className="source">
      Source: {sourceLabel(ids)} · <a href={href('/sources')}>All sources</a>
    </p>
  )
}
