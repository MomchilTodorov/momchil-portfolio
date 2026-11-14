import AutoplayVideo from './AutoplayVideo.jsx';

export default function CaseWalkthrough({recording, alt, caption, width = 1600, height = 800}) {
  const poster = `${recording}-poster.webp`;
  return (
    <figure>
      <div className="case-walkthrough">
        <img src={poster} width={width} height={height} loading="lazy" alt={alt}/>
        <AutoplayVideo src={`${recording}.mp4`} poster={poster}/>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
