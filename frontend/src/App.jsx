import {Routes,Route,Link,useParams} from 'react-router-dom';
import {usePortfolio} from './context.jsx';
import {Header,Footer,About,Contact,RouteEffects,PageMeta} from './components/Layout.jsx';
import Hero from './components/Hero.jsx';
import Expertise from './components/Expertise.jsx';
import Projects from './components/Projects.jsx';
import ProjectArt from './components/ProjectArt.jsx';
import {safeURL} from './api.js';

function HomePage(){
  const {data}=usePortfolio();
  return <><PageMeta title={`${data.profile.name} — WordPress & WooCommerce Developer`} description={data.profile.intro}/><main id="main" tabIndex={-1}><Hero profile={data.profile}/><Projects projects={data.projects}/><Expertise/><About profile={data.profile}/><Contact profile={data.profile}/></main></>;
}

function ProjectPage(){
  const {slug}=useParams();
  const {data,status,retry}=usePortfolio();
  const project=data.projects.find(item=>item.slug===slug);
  if(!project){
    if(status==='loading'||status==='refreshing'){
      return <>
        <PageMeta title={`Loading case study — ${data.profile.name}`} description="Loading the requested project and its case study."/>
        <main id="main" tabIndex={-1} className="case-page wrap"><p role="status">Loading case study…</p></main>
      </>;
    }
    if(status==='error'){
      return <>
        <PageMeta title={`Case study unavailable — ${data.profile.name}`} description="This case study couldn’t be loaded. Please try again."/>
        <main id="main" tabIndex={-1} className="case-page wrap"><h1>Case study unavailable</h1><p>This case study couldn’t be loaded.</p><button type="button" className="button button-dark" onClick={retry}>Try again</button></main>
      </>;
    }
    return <NotFound/>;
  }
  const clientURL=safeURL(project.clientUrl);
  return <><PageMeta title={`${project.title} — ${data.profile.name}`} description={project.summary}/><main id="main" tabIndex={-1} className="case-page wrap">
    <Link className="text-link back-link" to="/#work">← Back to selected work</Link><p className="case-category">{project.categoryLabel}</p><h1>{project.title}</h1><p className="case-summary">{project.summary}</p>
    {safeURL(project.image)?<div className="project-art project-image"><img src={safeURL(project.image)} alt=""/></div>:<ProjectArt visual={project.visual}/>}
    {/* HTML is rendered by WordPress and sanitized server-side with wp_kses_post. */}
    <div className="case-body" dangerouslySetInnerHTML={{__html:project.contentHTML}}/>
    <div className="case-stack">{project.stack.map(technology=><span key={technology}>{technology}</span>)}</div>
    <p className="case-credits">Agency work through tzn digital ventures GmbH. This case study describes my contribution to the project; the current live website may have changed since delivery.</p>
    <div className="case-actions">{clientURL&&<a className="button button-primary" href={clientURL} target="_blank" rel="noopener noreferrer">Visit client website<span className="sr-only"> (opens in a new tab)</span> <span aria-hidden="true">↗</span></a>}<Link className="text-link" to="/#contact">Contact me ↗</Link></div>
  </main></>;
}

function NotFound(){return <><PageMeta title="Page not found — Momchil Todorov" description="Return to Momchil Todorov’s portfolio."/><main id="main" tabIndex={-1} className="case-page wrap"><p className="eyebrow">404 / PAGE NOT FOUND</p><h1>Page not found</h1><p>This page doesn’t exist. You can find my projects on the homepage.</p><Link className="button button-primary" to="/">Back to portfolio ↗</Link></main></>;}

export default function App(){
  const {data,status,retry}=usePortfolio();
  if(!data)return <main id="main" className="case-page wrap"><h1>{status==='error'?'Portfolio unavailable':'Loading portfolio…'}</h1>{status==='error'?<><p>Please try again in a moment.</p><button className="button button-dark" onClick={retry}>Try again</button></>:<p role="status">Loading projects and profile.</p>}</main>;
  return <><RouteEffects/><Header profile={data.profile}/>{status==='error'&&<div className="refresh-notice wrap" role="status">Couldn’t refresh the portfolio. <button type="button" onClick={retry}>Try again</button></div>}<Routes><Route path="/" element={<HomePage/>}/><Route path="/work/:slug/" element={<ProjectPage/>}/><Route path="*" element={<NotFound/>}/></Routes><Footer profile={data.profile}/></>;
}
