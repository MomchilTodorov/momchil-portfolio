import {useEffect, useRef, useState} from 'react';
import {reducedMotionQuery} from './ProjectLink.jsx';

function muteVideo(video) {
  if (video) video.defaultMuted = true;
}

function startPlayback(event) {
  const video = event.currentTarget;
  if (video.paused) video.play().catch(() => {});
}

export default function AutoplayVideo({src, poster, playOffscreen = false}) {
  const frame = useRef(null);
  const [inView, setInView] = useState(false);
  const [allowsMotion, setAllowsMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia?.(reducedMotionQuery);
    const update = () => setAllowsMotion(!document.hidden && !preference?.matches);
    update();
    preference?.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      preference?.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  useEffect(() => {
    if (playOffscreen) return;
    if (!window.IntersectionObserver) {
      setInView(true);
      return;
    }
    const observer = new window.IntersectionObserver(([entry]) => {
      setInView(entry.intersectionRatio >= .25);
    }, {threshold: .25});
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, [playOffscreen]);

  return (
    <div ref={frame} className="autoplay-video" aria-hidden="true">
      {(playOffscreen || inView) && allowsMotion && (
        <video ref={muteVideo} src={src} poster={poster} autoPlay muted loop playsInline
          preload={playOffscreen ? 'auto' : undefined}
          onLoadedMetadata={playOffscreen ? startPlayback : undefined}
          onError={event => {event.currentTarget.hidden = true;}}/>
      )}
    </div>
  );
}
