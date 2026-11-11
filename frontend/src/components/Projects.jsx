import {useId, useState} from 'react';
import {Link} from 'react-router-dom';
import {safeURL} from '../api.js';
import ProjectArt from './ProjectArt.jsx';
import ProjectLink from './ProjectLink.jsx';
import useGalleryMotion, {galleryOffset} from './useGalleryMotion.js';

// Published brand photography from ligre.com and walhalla-weine.ch.
const covers = {
  ligre: '/assets/work/ligre.webp',
  walhalla: '/assets/work/walhalla.png',
};

export function ProjectMedia({project, eager = false}) {
  const suppliedImage = safeURL(project.image);
  const image = suppliedImage || covers[project.slug];

  if (!image) return <ProjectArt visual={project.visual}/>;

  return (
    <div className="project-cover" aria-hidden="true">
      <img src={image} alt="" loading={eager ? 'eager' : 'lazy'} draggable={false}/>
      {!suppliedImage && <span className="project-cover-title">{project.title}</span>}
    </div>
  );
}

function GalleryMotionFilter({id}) {
  return (
    <svg width="0" height="0" className="gallery-filters" aria-hidden="true">
      <filter id={id} x="-12%" y="-5%" width="124%" height="110%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="0" edgeMode="duplicate" result="smear"/>
        <feOffset in="smear" dx="0" data-shift="red"/>
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>
        <feColorMatrix in="smear" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
        <feOffset in="smear" dx="0" data-shift="blue"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>
        <feComposite in="red" in2="green" operator="arithmetic" k2="1" k3="1" result="red-green"/>
        <feComposite in="red-green" in2="blue" operator="arithmetic" k2="1" k3="1"/>
      </filter>
    </svg>
  );
}

export function ProjectGallery({projects, initialProject}) {
  const filterId = useId();
  const {active, stage, move, onWheel, blocksClick, ...pointerEvents} =
    useGalleryMotion(projects, initialProject);
  const current = projects[active];

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
      onKeyDown={handleKey}
      onWheel={onWheel}
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
                  style={{'--slide-offset': position}}
                  aria-hidden={nearby ? undefined : true}
                  aria-label={`Read the ${project.title} case study`}
                  tabIndex={position ? -1 : 0}
                  onClick={event => {
                    if (event.detail > 0 && blocksClick()) event.preventDefault();
                  }}
                >
                  <div className="gallery-surface">
                    <div className="gallery-media">
                      <ProjectMedia project={project} eager={nearby}/>
                    </div>
                  </div>
                </ProjectLink>
              );
            })}
          </div>
          <div className="gallery-navigation">
            <div
              className="gallery-progress"
              role="progressbar"
              aria-label="Gallery progress"
              aria-valuemin={0}
              aria-valuemax={projects.length}
              aria-valuenow={active + 1}
              style={{'--gallery-progress': `${(active + 1) / projects.length * 100}%`}}
            />
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
