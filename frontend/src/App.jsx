import {useRef,useState} from 'react';
import {Routes,Route,Link,useLocation,useParams} from 'react-router-dom';
import {usePortfolio} from './context.jsx';
import {Header,RouteEffects,PageMeta} from './components/Layout.jsx';
import {ProjectGallery,ProjectMedia} from './components/Projects.jsx';
import ProjectLink from './components/ProjectLink.jsx';
import {safeURL} from './api.js';

function HomePage({gallerySelections}){
  const {data}=usePortfolio();
  const {key,state}=useLocation();
  const [initialProject]=useState(()=>gallerySelections.get(key)??state?.project);
  return (
    <div className="showcase" id="top">
      <PageMeta title={`${data.profile.name} — WordPress & WooCommerce Developer`} description={data.profile.intro}/>
      <Header profile={data.profile} projects={data.projects}/>
      <main id="main" tabIndex={-1}>
        <ProjectGallery
          projects={data.projects}
          initialProject={initialProject}
          rememberSelection={slug=>gallerySelections.set(key,slug)}
        />
      </main>
    </div>
  );
}

function ProjectPage(){
  const {slug}=useParams();
  const {data,status,retry}=usePortfolio();
  const projectIndex=data.projects.findIndex(item=>item.slug===slug);
  const project=data.projects[projectIndex];
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
  const count=data.projects.length;
  const previous=data.projects[(projectIndex+count-1)%count];
  const next=data.projects[(projectIndex+1)%count];
  return (
    <>
      <PageMeta title={`${project.title} — ${data.profile.name}`} description={project.summary}/>
      <a className="skip-link" href="#main">Skip to content</a>
      <main key={slug} id="main" tabIndex={-1} className="case-page case-detail">
        <header className="case-header">
          <div><p>{project.categoryLabel}</p><p>Agency: tzn digital ventures</p></div>
          {clientURL && <a href={clientURL} target="_blank" rel="noopener noreferrer" aria-label="View client website (opens in a new tab)">View <span aria-hidden="true">↗</span></a>}
        </header>
        <div className="case-content">
          <div className="case-media"><ProjectMedia project={project} eager/></div>
          <h1>{project.title}</h1>
          <p className="case-summary">{project.summary}</p>
          {/* WordPress sanitizes the article HTML before serving it. */}
          <div className="case-body" dangerouslySetInnerHTML={{__html:project.contentHTML}}/>
          <div className="case-stack">{project.stack.map(technology=><span key={technology}>{technology}</span>)}</div>
          <p className="case-credits">Agency work through tzn digital ventures GmbH. This case study describes my contribution to the project; the current live website may have changed since delivery.</p>
          <Link className="text-link" to="/#contact">Contact me <span aria-hidden="true">↗</span></Link>
        </div>
        <nav className="case-navigation" aria-label="Case study navigation">
          <div className="case-switch">
            {count > 1 && <ProjectLink to={`/work/${previous.slug}/`} motion="previous" aria-label={`Previous project: ${previous.title}`}>←</ProjectLink>}
            <span>{project.title}</span>
            {count > 1 && <ProjectLink to={`/work/${next.slug}/`} motion="next" aria-label={`Next project: ${next.title}`}>→</ProjectLink>}
          </div>
          <ProjectLink className="back-link" to="/#work" state={{project:slug}} motion="close" aria-label="Close case study">×</ProjectLink>
        </nav>
      </main>
    </>
  );
}

function NotFound(){return <><PageMeta title="Page not found — Momchil Todorov" description="Return to Momchil Todorov’s portfolio."/><main id="main" tabIndex={-1} className="case-page wrap"><p className="eyebrow">404 / PAGE NOT FOUND</p><h1>Page not found</h1><p>This page doesn’t exist. You can find my projects on the homepage.</p><Link className="button button-primary" to="/">Back to portfolio ↗</Link></main></>;}

export default function App(){
  const {data,status,retry}=usePortfolio();
  const gallerySelections=useRef(new Map());
  if(!data)return <main id="main" className="case-page wrap"><h1>{status==='error'?'Portfolio unavailable':'Loading portfolio…'}</h1>{status==='error'?<><p>Please try again in a moment.</p><button className="button button-dark" onClick={retry}>Try again</button></>:<p role="status">Loading projects and profile.</p>}</main>;
  return <><RouteEffects/>{status==='error'&&<div className="refresh-notice wrap" role="status">Couldn’t refresh the portfolio. <button type="button" onClick={retry}>Try again</button></div>}<Routes><Route path="/" element={<HomePage gallerySelections={gallerySelections.current}/>}/><Route path="/work/:slug/" element={<ProjectPage/>}/><Route path="*" element={<NotFound/>}/></Routes></>;
}
