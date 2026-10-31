import {useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {safeURL} from '../api.js';

export function Header({profile}) {
  const names=profile.name.split(' ');
  return <><a className="skip-link" href="#main">Skip to content</a><header className="site-header wrap">
    <Link to="/" className="identity" aria-label={`${profile.name}, home`}><span className="monogram" aria-hidden="true">mt<span>°</span></span><span className="identity-name">{names[0]}<br/>{names.slice(1).join(' ')}</span></Link>
    <nav className="main-nav" aria-label="Main navigation"><Link to="/#work">Selected work</Link><Link to="/#about">About</Link><Link className="nav-contact" to="/#contact">Let’s talk <span aria-hidden="true">↗</span></Link></nav>
  </header></>;
}

export function About({profile}) {
  return <section className="about-section wrap" id="about" aria-labelledby="about-heading"><div className="about-heading"><p className="eyebrow">03 / THE PERSON BEHIND THE CODE</p><h2 id="about-heading">Hi, I’m {profile.name.split(' ')[0]}<span className="accent-dot">.</span></h2><div className="about-coordinates"><span className="square" aria-hidden="true"/> BASED IN {profile.location.toUpperCase()}</div></div><div className="about-content"><p className="about-lead">{profile.bio}</p><p>{profile.agencyBio}</p><p>{profile.focusBio}</p><div className="about-details"><div><span>EXPERIENCE</span><strong>Senior WordPress Developer</strong><p>{profile.employer}<br/>{profile.experienceStart}</p></div><div><span>EDUCATION</span><strong>A background in people, too.</strong><p>{profile.education}<br/>{profile.university}</p></div></div><a className="text-link" href={safeURL(profile.cvUrl)} download>View my full experience <span className="filetype">CV / DOCX</span><span aria-hidden="true">↓</span></a></div></section>;
}

export function Contact({profile}) {
  const [label,setLabel]=useState('Copy email');
  const [announcement,setAnnouncement]=useState('');
  useEffect(()=>{
    if(label==='Copy email')return;
    const timer=setTimeout(()=>setLabel('Copy email'),2500);
    return()=>clearTimeout(timer);
  },[label]);
  async function copy(){
    try {await navigator.clipboard.writeText(profile.email);setLabel('Email copied');setAnnouncement('Email address copied to clipboard.');}
    catch {setLabel('Select email to copy');setAnnouncement('Select the email address and use your browser’s copy command.');}
  }
  return <section className="contact-section" id="contact" aria-labelledby="contact-heading"><div className="wrap"><div className="contact-top"><p className="eyebrow">04 / LET’S BUILD SOMETHING</p><span className="contact-location">{profile.location.toUpperCase()} / EUROPE</span></div><h2 id="contact-heading">Good work starts<br/>with a <span className="serif">conversation.</span></h2><div className="contact-bottom"><div><p>Have a WordPress project or an agency role in mind?<br/>Tell me what you’re working on.</p><a className="email-link" href={`mailto:${profile.email}`}>{profile.email} <span aria-hidden="true">↗</span></a></div><button className="copy-email" type="button" onClick={copy}><span className="copy-icon" aria-hidden="true">⧉</span><span className="copy-label">{label}</span></button></div><p className="sr-only" role="status" aria-live="polite">{announcement}</p></div></section>;
}

export function Footer({profile}) {
  return <footer className="site-footer wrap"><Link className="footer-name" to="/">{profile.name}<span>°</span></Link><span>WordPress. WooCommerce. The details.</span><Link to="/#top">Back to top ↑</Link></footer>;
}

export function RouteEffects(){
  const {pathname,hash}=useLocation();
  useEffect(()=>{
    if(hash){const frame=requestAnimationFrame(()=>document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView());return()=>cancelAnimationFrame(frame);}
    window.scrollTo(0,0);
  },[pathname,hash]);
  return null;
}

export function PageMeta({title,description}){
  const {pathname}=useLocation();
  useEffect(()=>{
    document.title=title;
    document.querySelector('meta[name="description"]')?.setAttribute('content',description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content',title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content',description);
    let canonical=document.querySelector('link[rel="canonical"]');
    if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}
    canonical.href=new URL(pathname,window.location.origin).href;
  },[title,description,pathname]);
  return null;
}
