import {useLayoutEffect, useState} from 'react';
import {prefersReducedMotion} from './ProjectLink.jsx';

const countDelay = 250;
const countDuration = 1500;
const imageDeadline = 5000;
const digitInterval = 350;
const revealDuration = 900;
const zero = '000';

export default function GalleryLoader({stage, indicator, revealing, setPhase}) {
  const [digits, setDigits] = useState({current: zero, previous: zero});

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (prefersReducedMotion() || root.dataset.galleryBoot === 'expired') {
      setPhase('done');
      return;
    }
    delete root.dataset.galleryBoot;

    const bar = indicator.current;
    const covers = [...stage.current.querySelectorAll('.gallery-slide[data-nearby="true"] img')];
    let settled = 0;
    for (const cover of covers) {
      Promise.resolve(cover.decode?.()).catch(() => {}).then(() => { settled += 1; });
    }

    let started;
    let lastUpdate = 0;
    let lastCount = zero;
    let frame;
    let revealTimer;
    setPhase('loading');

    function tick(now) {
      if (prefersReducedMotion()) {
        setPhase('done');
        return;
      }
      started ??= now;
      const elapsed = now - started;
      const time = Math.max(0, Math.min(1, (elapsed - countDelay) / countDuration));
      const paced = time < .5 ? 4 * time ** 3 : 1 - 4 * (1 - time) ** 3;
      const loaded = covers.length && elapsed < imageDeadline ? settled / covers.length : 1;
      const progress = Math.min(paced, loaded);
      bar.style.setProperty('--gallery-load', progress);

      const count = String(Math.floor(progress * 100)).padStart(3, '0');
      if (count !== lastCount && (elapsed - lastUpdate >= digitInterval || progress === 1)) {
        setDigits({current: count, previous: lastCount});
        lastCount = count;
        lastUpdate = elapsed;
      }

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setPhase('revealing');
        revealTimer = window.setTimeout(() => setPhase('done'), revealDuration);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(revealTimer);
      bar.style.removeProperty('--gallery-load');
    };
  }, [stage, indicator, setPhase]);

  return (
    <div className="gallery-loader">
      {!revealing && <span className="sr-only" role="status">Loading selected work</span>}
      <span className="gallery-loader-counter" aria-hidden="true">
        {[...digits.current].map((digit, index) => {
          const previous = digits.previous[index];
          const changed = digit !== previous;
          return (
            <span className="gallery-loader-digit" key={index}>
              {changed && <span className="gallery-loader-digit-out" key={previous}>{previous}</span>}
              <span className={changed ? 'gallery-loader-digit-in' : undefined} key={digit}>{digit}</span>
            </span>
          );
        })}
      </span>
    </div>
  );
}
