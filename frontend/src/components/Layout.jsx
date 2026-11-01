import {useEffect, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {safeURL} from '../api.js';

export function Header({profile}) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header wrap">
        <Link to="/" className="identity" aria-label={`${profile.name}, home`}>
          {profile.name}<span className="identity-dot" aria-hidden="true">.</span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link to="/#about">Experience</Link>
          <Link to="/#contact">Contact me <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>
    </>
  );
}

export function About({profile}) {
  return (
    <section className="about-section wrap" id="about" aria-labelledby="about-heading">
      <div className="about-heading">
        <p className="eyebrow">About me</p>
        <h2 id="about-heading">Experience</h2>
        <p className="about-location">Based in {profile.location}</p>
        <a className="button button-secondary cv-link" href={safeURL(profile.cvUrl)} download>
          Download CV <span className="filetype">DOCX</span><span aria-hidden="true">↓</span>
        </a>
      </div>
      <div className="about-content">
        <p className="about-lead">{profile.bio}</p>
        <p>{profile.agencyBio}</p>
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

  useEffect(() => {
    if (label === 'Copy email') return;
    const timer = setTimeout(() => setLabel('Copy email'), 2500);
    return () => clearTimeout(timer);
  }, [label]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(profile.email);
      setLabel('Email copied');
      setAnnouncement('Email address copied to clipboard.');
    } catch {
      setLabel('Select email to copy');
      setAnnouncement('Select the email address and use your browser’s copy command.');
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
        <button className="button button-secondary copy-email" type="button" onClick={copy}>
          <span className="copy-label">{label}</span>
        </button>
        <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      </div>
    </section>
  );
}

export function Footer({profile}) {
  return (
    <footer className="site-footer wrap">
      <Link className="footer-name" to="/">{profile.name} <span>· WordPress developer</span></Link>
      <div className="footer-links"><span>{profile.location}</span><Link to="/#top">Back to top ↑</Link></div>
    </footer>
  );
}

export function RouteEffects() {
  const {pathname, hash} = useLocation();
  useEffect(() => {
    if (hash) {
      const frame = requestAnimationFrame(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView());
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
