import {useEffect, useRef} from 'react';
import {reducedMotionQuery} from './ProjectLink.jsx';

const mediaPath = '/assets/work/ptm';

export const ptmCover = `${mediaPath}/agitator-configurator.png`;
export const ptmMotorWalkthrough = `${mediaPath}/ptm-motor-walkthrough`;

export default function PtmCaseMedia() {
  const walkthrough = useRef(null);

  useEffect(() => {
    const video = walkthrough.current;
    const preference = window.matchMedia?.(reducedMotionQuery);

    function playWhenVisible() {
      if (preference?.matches || video.currentTime > 0 || !video.paused) return;
      video.muted = true;
      video.play().catch(() => {
        // The native controls remain available if the browser blocks autoplay.
      });
    }

    if (!window.IntersectionObserver) {
      playWhenVisible();
      return;
    }

    const observer = new window.IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio < .25) return;
      observer.disconnect();
      playWhenVisible();
    }, {threshold: .25});
    observer.observe(video);
    return () => observer.disconnect();
  }, []);
  return (
    <section className="case-examples ptm-examples" aria-labelledby="ptm-examples-heading">
      <h2 id="ptm-examples-heading">Configurator examples</h2>
      <figure className="ptm-walkthrough">
        <video ref={walkthrough} controls muted playsInline preload="none" width="1024" height="576"
          poster={`${ptmMotorWalkthrough}-poster.webp`} aria-label="PTM air motor configurator walkthrough">
          <source src={`${ptmMotorWalkthrough}.mp4`} type="video/mp4"/>
        </video>
        <figcaption>The full air motor questionnaire, from torque and speed requirements to the matched WooCommerce bundle and its price.</figcaption>
      </figure>
      <figure>
        <div className="ptm-requirements">
          <img src={`${mediaPath}/agitator-requirements.png`} width="2526" height="1173" loading="lazy"
            alt="Agitator questionnaire with choices for the drive, stirring process and shaft connection."/>
        </div>
        <figcaption>
          The <a href="https://ptm-mechatronics.com/en/product/special-container-configurator/">custom container questionnaire</a> gathers requirements for a quote.
        </figcaption>
      </figure>
      <figure>
        <img src={`${mediaPath}/motor-result.jpg`} width="601" height="427" loading="lazy"
          alt="Matched bundle with an ATEX air motor, a keyed drive hub and an NBR seal, priced at 798.08 euros excluding VAT."/>
        <figcaption>
          The <a href="https://ptm-mechatronics.com/en/product/pneumatic-motor-configurator-atex-zone-1-motor-made-of-aluminum/">air motor configurator</a> shows the matched components, total price and Add to cart button.
        </figcaption>
      </figure>
    </section>
  );
}
