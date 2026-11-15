import {useId, useLayoutEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {safeURL} from '../api.js';
import ProjectArt from './ProjectArt.jsx';
import {tznFilmRecording, tznHomepage} from './TznCaseMedia.jsx';
import {ligreHomeRecording} from './LigreCaseMedia.jsx';
import {elfbarStorefrontRecording} from './ElfbarCaseMedia.jsx';
import {walhallaHomeRecording} from './WalhallaCaseMedia.jsx';
import {ptmCover, ptmMotorWalkthrough} from './PtmCaseMedia.jsx';
import AutoplayVideo from './AutoplayVideo.jsx';
import ProjectLink from './ProjectLink.jsx';
import GalleryLoader from './GalleryLoader.jsx';
import useGalleryMotion, {galleryOffset} from './useGalleryMotion.js';

// Published brand photography from ligre.com and walhalla-weine.ch.
const covers = {
  ligre: '/assets/work/ligre.webp',
  walhalla: '/assets/work/walhalla.png',
  tzn: tznHomepage,
  ptm: ptmCover,
};

const galleryRecordings = {
  ligre: ligreHomeRecording,
  walhalla: walhallaHomeRecording,
  elfbar: elfbarStorefrontRecording,
  tzn: tznFilmRecording,
  ptm: ptmMotorWalkthrough,
};

export function ProjectMedia({project, eager = false, gallery = false, animate = false}) {
  const [failedImages, setFailedImages] = useState(() => new Set());
  const suppliedImage = safeURL(project.image);
  const recording = gallery && galleryRecordings[project.slug];
  const poster = recording && `${recording}-poster.webp`;
  const images = project.slug === 'tzn' ? [poster, suppliedImage] : [suppliedImage, poster];
  const image = [...images, covers[project.slug]].find(url => url && !failedImages.has(url));

  if (!image) return <ProjectArt visual={project.visual}/>;

  return (
    <div className="project-cover" aria-hidden="true">
      <img
        key={image}
        src={image}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        draggable={false}
        onError={() => setFailedImages(failed => new Set([...failed, image]))}
      />
      {animate && recording && <AutoplayVideo src={`${recording}.mp4`} poster={image} playOffscreen/>}
      {image !== suppliedImage && image !== poster && image !== tznHomepage && image !== ptmCover && (
        <span className="project-cover-title">{project.title}</span>
      )}
    </div>
  );
}

function GalleryMotionFilter({id}) {
  return (
    <svg width="0" height="0" className="gallery-filters" aria-hidden="true">
      <filter id={id} x="-2%" y="0" width="104%" height="100%" colorInterpolationFilters="sRGB">
        {/* Fill the narrow strip exposed by each offset before selecting that channel. */}
        <feOffset in="SourceGraphic" dx="0" data-shift="red" result="red-shifted"/>
        <feComposite in="red-shifted" in2="SourceGraphic" operator="over"/>
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
        <feOffset in="SourceGraphic" dx="0" data-shift="blue" result="blue-shifted"/>
        <feComposite in="blue-shifted" in2="SourceGraphic" operator="over"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>
        <feComposite in="red" in2="green" operator="arithmetic" k2="1" k3="1" result="red-green"/>
        <feComposite in="red-green" in2="blue" operator="arithmetic" k2="1" k3="1"/>
      </filter>
    </svg>
  );
}

const progressArc = 'M4 17.4 A100 100 0 0 1 104 17.4';

export function ProjectGallery({projects, initialProject, playLoader, rememberSelection}) {
  const filterId = useId();
  const indicator = useRef(null);
  const [loaderPhase, setLoaderPhase] = useState('idle');
  const waitingForLoader = playLoader && (loaderPhase === 'idle' || loaderPhase === 'loading');
  const loading = playLoader && loaderPhase === 'loading';
  const revealing = playLoader && loaderPhase === 'revealing';
  const {active, stage, move, onWheel, blocksClick, ...pointerEvents} =
    useGalleryMotion(projects, initialProject, waitingForLoader, indicator);
  const current = projects[active];
  const selectedSlug = current?.slug;
  useLayoutEffect(() => {
    if (selectedSlug) rememberSelection(selectedSlug);
  }, [selectedSlug, rememberSelection]);

  function handleKey(event) {
    if (projects.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    const moveFocus = event.target.closest('.gallery-slide');
    const gallery = event.currentTarget;
    const next = move(direction);
    if (moveFocus) requestAnimationFrame(() => gallery.querySelectorAll('.gallery-slide')[next]?.focus());
  }

  return (
    <section
      className="project-gallery"
      id="work"
      aria-labelledby="gallery-heading"
      data-starting={playLoader && current && loaderPhase === 'idle' ? '' : undefined}
      data-loading={loading ? '' : undefined}
      data-revealing={revealing ? '' : undefined}
      onKeyDown={waitingForLoader ? undefined : handleKey}
      onWheel={waitingForLoader ? undefined : onWheel}
    >
      <h2 className="sr-only" id="gallery-heading">Selected work</h2>
      {current ? (
        <>
          <div
            className="gallery-stage"
            ref={stage}
            style={{'--gallery-filter': `url("#${filterId}")`}}
            {...pointerEvents}
            onDragStart={event => event.preventDefault()}
          >
            <GalleryMotionFilter id={filterId}/>
            {projects.map((project, index) => {
              const position = galleryOffset(index, active, projects.length);
              const nearby = Math.abs(position) <= 1;
              return (
                <ProjectLink
                  key={project.slug}
                  to={`/work/${project.slug}/`}
                  motion="open"
                  className="gallery-slide"
                  data-position={position}
                  data-nearby={nearby}
                  aria-hidden={nearby ? undefined : true}
                  aria-label={`Read the ${project.title} case study`}
                  tabIndex={position ? -1 : 0}
                  onClick={event => {
                    if (event.detail > 0 && blocksClick()) event.preventDefault();
                  }}
                >
                  <div className="gallery-surface">
                    <div className="gallery-media">
                      <ProjectMedia project={project} eager={nearby} gallery animate={!waitingForLoader}/>
                    </div>
                  </div>
                </ProjectLink>
              );
            })}
          </div>
          <canvas className="gallery-projection" aria-hidden="true"/>
          <div
            className="gallery-progress"
            ref={indicator}
            role="progressbar"
            aria-label="Gallery progress"
            aria-hidden={loading || undefined}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
          >
            <svg viewBox="0 0 108 21.4" width="108" height="21.4" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line className="gallery-progress-loading" x1="4" x2="104" y1="17.4" y2="17.4"/>
              <g className="gallery-progress-arc">
                <path className="gallery-progress-track" d={progressArc} vectorEffect="non-scaling-stroke"/>
                <path className="gallery-progress-fill" d={progressArc} pathLength="1" vectorEffect="non-scaling-stroke"/>
              </g>
            </svg>
          </div>
          <div className="gallery-navigation">
            {playLoader && loaderPhase !== 'done' && (
              <GalleryLoader stage={stage} indicator={indicator} revealing={revealing} setPhase={setLoaderPhase}/>
            )}
            <div className="gallery-controls">
              {projects.length > 1 && <button type="button" aria-label="Previous project" onClick={() => move(-1)}>←</button>}
              <ProjectLink className="gallery-current" to={`/work/${current.slug}/`} motion="open" aria-live="polite">{current.title}</ProjectLink>
              {projects.length > 1 && <button type="button" aria-label="Next project" onClick={() => move(1)}>→</button>}
            </div>
          </div>
        </>
      ) : <p className="gallery-empty">No projects have been published yet.</p>}
    </section>
  );
}

export function ProjectCard({project}) {
  const image = safeURL(project.image);
  return (
    <article className="project-card">
      <Link className="project-link" to={`/work/${project.slug}/`} aria-label={`Read the ${project.title} case study`}>
        {image && <div className="project-image"><img src={image} alt="" loading="lazy"/></div>}
        <p className="project-category">{project.categoryLabel}</p>
        <h3>{project.title}</h3>
        <p className="project-summary">{project.summary}</p>
        <span className="project-read">What I worked on <span aria-hidden="true">↗</span></span>
      </Link>
    </article>
  );
}

export function ProjectIndex({projects}) {
  const [active, setActive] = useState('all');
  const filters = [['all', 'All'], ['woocommerce', 'WooCommerce'], ['integrations', 'Integrations'], ['frontend', 'Front end']];
  const shown = projects.filter(project => active === 'all' || project.categories.includes(active));

  return (
    <section className="work-section wrap" aria-labelledby="work-heading">
      <div className="section-intro">
        <h2 id="work-heading">Selected work</h2>
        <p className="section-description">Projects I’ve worked on with agency teams.</p>
      </div>
      <div className="work-toolbar">
        <div className="filters" role="group" aria-label="Filter projects">
          {filters.map(([slug, label]) => {
            const count = slug === 'all' ? projects.length : projects.filter(project => project.categories.includes(slug)).length;
            return (
              <button key={slug} type="button" className={`filter${active === slug ? ' active' : ''}`} aria-pressed={active === slug} onClick={() => setActive(slug)}>
                {label} <span>{count}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">Showing {shown.length} {shown.length === 1 ? 'project' : 'projects'}.</p>
      <div className="project-grid">{shown.map(project => <ProjectCard key={project.id} project={project}/>)}</div>
      {!shown.length && <p className="empty-projects">No projects in this category yet.</p>}
      <p className="work-credit">Work completed through tzn digital ventures GmbH. Each case study explains my part in the project. Project diagrams are illustrations; live websites may have changed since the work was delivered.</p>
    </section>
  );
}
