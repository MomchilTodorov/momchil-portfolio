export default function Expertise() {
  return (
    <section className="expertise-section" id="expertise" aria-labelledby="expertise-heading">
      <div className="wrap expertise-inner">
        <div className="expertise-heading"><h2 id="expertise-heading">What I work on</h2></div>
        <div className="expertise-list">
          <div className="expertise-item">
            <h3>WordPress development</h3>
            <p>Custom themes and plugins using PHP, ACF and WordPress hooks.</p>
            <div className="skill-tags"><span>PHP / OOP</span><span>Hooks &amp; filters</span><span>ACF Pro</span></div>
          </div>
          <div className="expertise-item">
            <h3>WooCommerce &amp; integrations</h3>
            <p>Store features, product options, and connections to other business systems.</p>
            <div className="skill-tags"><span>REST APIs</span><span>Webhooks</span><span>ERP sync</span></div>
          </div>
          <div className="expertise-item">
            <h3>Front end &amp; support</h3>
            <p>Responsive pages from Figma and Adobe XD, debugging, caching and site speed.</p>
            <div className="skill-tags"><span>JavaScript</span><span>Core Web Vitals</span><span>Git</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
