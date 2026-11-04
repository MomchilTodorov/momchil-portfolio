import {useState} from 'react';
import {Link} from 'react-router-dom';
import {safeURL} from '../api.js';

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

export default function Projects({projects}) {
  const [active, setActive] = useState('all');
  const filters = [['all', 'All'], ['woocommerce', 'WooCommerce'], ['integrations', 'Integrations'], ['frontend', 'Front end']];
  const shown = projects.filter(project => active === 'all' || project.categories.includes(active));

  return (
    <section className="work-section wrap" id="work" aria-labelledby="work-heading">
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
