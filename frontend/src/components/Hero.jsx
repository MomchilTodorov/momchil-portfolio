import {safeURL} from '../api.js';
export default function Hero({profile}) { return (
    <section className="hero wrap" id="top" aria-labelledby="hero-title">
      <div className="hero-topline"><span><span className="square" aria-hidden="true"></span> {profile.role.toUpperCase()}</span><span className="location">{profile.location.toUpperCase()} <span aria-hidden="true">↗</span></span></div>
      <div className="hero-body">
        <div className="hero-copy">
          <h1 id="hero-title">Behind the site.<br />Into the <span className="serif">details.</span></h1>
          <p className="hero-description">{profile.intro}</p>
          <div className="hero-actions"><a className="button button-dark" href="#work">Explore my work <span aria-hidden="true">↘</span></a><a className="text-link" href={safeURL(profile.cvUrl)} download>Download CV <span className="filetype">DOCX</span><span aria-hidden="true">↓</span></a></div>
        </div>
        <div className="engineering-visual" aria-label="Development focus: responsive interfaces, WordPress and WooCommerce, and connected business systems">
          <div className="visual-header"><span className="visual-label">FROM INTERFACE TO INTEGRATION</span><span className="visual-plus" aria-hidden="true">+</span></div>
          <div className="interface-layer"><span className="layer-number">01</span><div><span className="layer-caption">THE EXPERIENCE</span><strong>Built for people.</strong><span className="layer-tags">Responsive UI &nbsp; / &nbsp; Reusable components</span></div><span className="layer-mark" aria-hidden="true">↗</span></div>
          <div className="visual-connector" aria-hidden="true"><span></span></div>
          <div className="core-layer"><div className="core-title"><span className="layer-number">02</span><span className="layer-caption">THE ENGINE</span><span className="core-code" aria-hidden="true">&lt;/&gt;</span></div><strong>WordPress<br /><span>+ WooCommerce</span></strong><div className="core-tags"><span>PHP / OOP</span><span>MySQL</span><span>Hooks & filters</span></div></div>
          <div className="visual-connector" aria-hidden="true"><span></span></div>
          <div className="systems-layer"><span className="layer-number">03</span><div><span className="layer-caption">THE CONNECTIONS</span><strong>APIs. ERP. Workflows.</strong></div><span className="layer-mark" aria-hidden="true">↔</span></div>
          <div className="visual-footer"><span className="small-dot" aria-hidden="true"></span> THE PARTS YOU SEE. THE LOGIC YOU DON’T.</div>
        </div>
      </div>
      <div className="experience-strip"><div><strong>{profile.experienceYears}+</strong><span>years of agency<br />experience</span></div><div><strong>{profile.siteCount}+</strong><span>production websites<br />built & supported</span></div><div className="strip-note"><span className="mini-cross" aria-hidden="true">✳</span><p>From design handoff<br />to production support.</p></div></div>
    </section>


); }

