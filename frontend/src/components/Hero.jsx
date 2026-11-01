export default function Hero({profile}) {
  const firstName = profile.name.trim().split(/\s+/)[0];
  const initials = profile.name.trim().split(/\s+/).map(name => name[0]).slice(0, 2).join('');

  return (
    <section className="hero wrap" id="top" aria-labelledby="hero-title">
      <div className="hero-body">
        <div className="hero-copy">
          <p className="eyebrow">WordPress developer <span aria-hidden="true">·</span> {profile.location}</p>
          <h1 id="hero-title">Hi, I’m {firstName}.<br/>I build WordPress<br/>websites.</h1>
          <p className="hero-description">{profile.intro}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#contact">Contact me <span aria-hidden="true">↗</span></a>
            <a className="button button-secondary" href="#about">My experience</a>
          </div>
        </div>
        <aside className="profile-card" aria-label="About me">
          <div className="profile-initials" aria-hidden="true">{initials}</div>
          <p className="profile-name">{profile.name}</p>
          <p className="profile-role">{profile.role}</p>
          <p className="profile-note">{profile.experienceYears}+ years with agency teams<br/>PHP · MySQL · JavaScript</p>
        </aside>
      </div>
      <div className="experience-strip" aria-label="Experience at a glance">
        <div><strong>{profile.experienceYears}+ years</strong><span>Agency experience</span></div>
        <div><strong>{profile.siteCount}+ websites</strong><span>Built &amp; supported</span></div>
        <div><strong>Custom PHP</strong><span>Themes, plugins &amp; APIs</span></div>
      </div>
    </section>
  );
}
