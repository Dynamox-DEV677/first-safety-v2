import { VIDEO_TOPICS, videoUrl, videos } from '../data/videos'

/** Links to verified videos. They open on YouTube so the app itself loads no third-party scripts. */
export default function VideoList() {
  return (
    <div className="page-main">
      <p className="eyebrow">Learn · Videos</p>
      <h1 className="title">Watch</h1>
      <p className="body">
        These open on YouTube and need an internet connection. They were made by the organisations named, not by
        First Safety.
      </p>
      {videos.map((v) => (
        <div className="video" key={v.id}>
          <p className="eyebrow">{VIDEO_TOPICS[v.topic]}</p>
          <b>{v.title}</b>
          <span className="ch">{v.channel}</span>
          <p>{v.about}</p>
          <a className="btn btn-sm" href={videoUrl(v)} target="_blank" rel="noopener noreferrer">
            Watch on YouTube
          </a>
        </div>
      ))}
    </div>
  )
}
