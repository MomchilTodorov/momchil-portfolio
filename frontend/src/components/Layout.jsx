import {useEffect, useRef, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {safeURL} from '../api.js';
import Expertise from './Expertise.jsx';
import {ProjectIndex} from './Projects.jsx';

function getFragmentId(hash) {
  const fragment = hash.slice(1);
  try {
    return decodeURIComponent(fragment);
  } catch {
    // A malformed escape can still be part of a literal element ID.
    return fragment;
  }
}

export function Header({profile, projects}) {
  const panel = useRef(null);
  const trigger = useRef(null);
  const {hash} = useLocation();

  useEffect(() => {
    if (!['about', 'contact', 'expertise'].includes(getFragmentId(hash))) return;
    const dialog = panel.current;
    if (!dialog.open) dialog.showModal();
  }, [hash]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="showcase-header">
        <div className="showcase-identity">
          <h1>{profile.name}</h1>
          <p>{profile.role}</p>
        </div>
        <button ref={trigger} className="showcase-about" type="button" onClick={() => panel.current.showModal()} aria-haspopup="dialog">
          About
        </button>
      </header>
      <dialog
        ref={panel}
        className="about-dialog"
        aria-labelledby="about-dialog-title"
        onClose={() => trigger.current?.focus()}
        onClick={event => {
          if (event.target === event.currentTarget) panel.current.close();
        }}
      >
        <div className="about-sheet">
          <div className="about-bar">
            <h2 id="about-dialog-title">About</h2>
            <button type="button" onClick={() => panel.current.close()}>Close <span aria-hidden="true">×</span></button>
          </div>
          <div className="about-scroll">
            <About profile={profile}/>
            <Expertise/>
            <ProjectIndex projects={projects}/>
            <Contact profile={profile}/>
          </div>
          <div className="about-links">
            {safeURL(profile.cvUrl) && <a href={safeURL(profile.cvUrl)} download>Download CV</a>}
            <a href="https://github.com/MomchilTodorov" target="_blank" rel="noopener noreferrer" aria-label="GitHub (opens in a new tab)">GitHub</a>
            <a href={`mailto:${profile.email}`}>Email</a>
          </div>
        </div>
      </dialog>
    </>
  );
}

export function About({profile}) {
  return (
    <section className="about-section wrap" id="about" aria-labelledby="about-heading">
      <div className="about-heading">
        <h2 id="about-heading">Experience</h2>
        <p className="about-location">Based in {profile.location}</p>
      </div>
      <div className="about-content">
        <p className="about-lead">{profile.bio}</p>
        <p>{profile.agencyBio}</p>
        <p>{profile.experienceYears}+ years with agency teams and {profile.siteCount}+ websites built or supported.</p>
        <p>{profile.focusBio}</p>
        <div className="about-details">
          <div><span>Work</span><strong>{profile.role}</strong><p>{profile.employer}<br/>{profile.experienceStart}</p></div>
          <div><span>Education</span><strong>{profile.education}</strong><p>{profile.university}</p></div>
        </div>
      </div>
    </section>
  );
}

export function Contact({profile}) {
  const [label, setLabel] = useState('Copy email');
  const [announcement, setAnnouncement] = useState('');
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (copying || label === 'Copy email') return;
    const timer = setTimeout(() => setLabel('Copy email'), 2500);
    return () => clearTimeout(timer);
  }, [label, copying]);

  async function copy() {
    setCopying(true);
    setAnnouncement('Copying email address…');
    try {
      await navigator.clipboard.writeText(profile.email);
      setLabel('Email copied');
      setAnnouncement('Email address copied to clipboard.');
    } catch {
      setLabel('Select email to copy');
      setAnnouncement('Select the email address and use your browser’s copy command.');
    } finally {
      setCopying(false);
    }
  }

  return (
    <section className="contact-section wrap" id="contact" aria-labelledby="contact-heading">
      <div className="contact-panel">
        <div>
          <p className="eyebrow">Get in touch</p>
          <h2 id="contact-heading">Contact me</h2>
          <p className="contact-description">If you’re hiring a WordPress developer or have a project in mind, send me an email.</p>
          <a className="email-link" href={`mailto:${profile.email}`}>{profile.email} <span aria-hidden="true">↗</span></a>
        </div>
        <button className="button button-secondary copy-email" type="button" onClick={copy} disabled={copying} aria-busy={copying}>
          <span className="copy-label">{copying ? 'Copying email…' : label}</span>
        </button>
        <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      </div>
    </section>
  );
}

export function RouteEffects() {
  const {pathname, hash} = useLocation();
  const previousPathname = useRef(pathname);
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      document.getElementById('main')?.focus({preventScroll: true});
      previousPathname.current = pathname;
    }
    if (hash) {
      const id = getFragmentId(hash);
      const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
      return () => cancelAnimationFrame(frame);
    }
    window.scrollTo({top: 0, left: 0, behavior: 'instant'});
  }, [pathname, hash]);
  return null;
}

export function PageMeta({title, description}) {
  const {pathname} = useLocation();
  useEffect(() => {
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = new URL(pathname, window.location.origin).href;
  }, [title, description, pathname]);
  return null;
}
