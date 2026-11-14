import {useEffect, useRef, useState} from 'react';

export default function CaseScrollProgress() {
  const indicator = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const page = document.scrollingElement || document.documentElement;
    let frame = null;

    function measure() {
      frame = null;
      const distance = page.scrollHeight - page.clientHeight;
      setProgress(distance > 0 ? Math.max(0, Math.min(1, page.scrollTop / distance)) : 0);
    }

    function scheduleMeasure() {
      if (frame === null) frame = requestAnimationFrame(measure);
    }

    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleMeasure) : null;
    const article = indicator.current.closest('.case-detail');
    if (article) observer?.observe(article);
    window.addEventListener('scroll', scheduleMeasure, {passive: true});
    window.addEventListener('resize', scheduleMeasure);
    scheduleMeasure();

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', scheduleMeasure);
      window.removeEventListener('resize', scheduleMeasure);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={indicator} className="case-scroll-progress" role="progressbar" aria-label="Case study scroll progress"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"
        aria-hidden="true">
        <circle cx="12" cy="12" r="10" opacity=".45"/>
        {progress > 0 && (
          <circle cx="12" cy="12" r="10" pathLength="1" strokeDasharray={`${progress} 2`}
            strokeLinecap="round" transform="rotate(-90 12 12)"/>
        )}
      </svg>
    </div>
  );
}
