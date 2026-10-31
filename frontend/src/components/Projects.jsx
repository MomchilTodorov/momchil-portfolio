import {useState} from 'react';
import {Link} from 'react-router-dom';
import ProjectArt from './ProjectArt.jsx';
import {safeURL} from '../api.js';

export function ProjectCard({project}){
  return <article className="project-card"><Link className="project-link" to={`/work/${project.slug}/`} aria-label={`Read the ${project.title} case study`}>
    {safeURL(project.image)?<div className="project-art project-image"><img src={safeURL(project.image)} alt="" loading="lazy"/></div>:<ProjectArt visual={project.visual}/>}
    <div className="project-meta"><span>{project.categoryLabel}</span><span>CASE STUDY ↗</span></div><h3>{project.title}</h3><p>{project.summary}</p>
  </Link></article>;
}

export default function Projects({projects}){
  const [active,setActive]=useState('all');
  const filters=[['all','All'],['woocommerce','WooCommerce'],['integrations','Integrations'],['frontend','Front end']];
  const shown=projects.filter(project=>active==='all'||project.categories.includes(active));
  return <section className="work-section wrap" id="work" aria-labelledby="work-heading">
    <div className="section-intro"><div><p className="eyebrow">01 / SELECTED WORK</p><h2 id="work-heading">The work,<br/><span className="serif">beneath the surface.</span></h2></div><p className="section-description">A closer look at my contributions to real agency projects: custom features, connected systems and the details that make them work.</p></div>
    <div className="work-toolbar"><p>PROJECTS FROM AGENCY WORK</p><div className="filters" role="group" aria-label="Filter projects">{filters.map(([slug,label])=><button key={slug} type="button" className={`filter${active===slug?' active':''}`} aria-pressed={active===slug} onClick={()=>setActive(slug)}>{label}{slug==='all'&&<span>{String(projects.length).padStart(2,'0')}</span>}</button>)}</div></div>
    <p className="sr-only" role="status" aria-live="polite">Showing {shown.length} {shown.length===1?'project':'projects'}.</p>
    <div className="project-grid">{shown.map(project=><ProjectCard key={project.id} project={project}/>)}</div>
    {!shown.length&&<p className="empty-projects">No projects in this category yet.</p>}
    <p className="work-credit">Selected contributions made through tzn digital ventures GmbH. Project visuals are technical illustrations unless a project image is shown; live websites may have evolved since the work was delivered.</p>
  </section>;
}
