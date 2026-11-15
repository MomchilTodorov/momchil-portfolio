import CaseWalkthrough from './CaseWalkthrough.jsx';

const mediaPath = '/assets/work/ptm';

export const ptmCover = `${mediaPath}/agitator-configurator.png`;
export const ptmMotorWalkthrough = `${mediaPath}/ptm-motor-walkthrough`;

export default function PtmCaseMedia() {
  return (
    <section className="case-examples ptm-examples" aria-labelledby="ptm-examples-heading">
      <h2 id="ptm-examples-heading">Configurator examples</h2>
      <CaseWalkthrough recording={ptmMotorWalkthrough} width={1920} height={956}
        alt="PTM stainless steel air motor configurator with torque and speed options."
        caption="Walkthrough of the stainless steel air motor configurator, including how changing options updates the WooCommerce bundle and its price."/>
      <figure>
        <div className="ptm-requirements">
          <img src={`${mediaPath}/agitator-requirements.png`} width="2526" height="1173" loading="lazy"
            alt="Agitator questionnaire with choices for the drive, stirring process and shaft connection."/>
        </div>
        <figcaption>
          The <a href="https://ptm-mechatronics.com/en/product/special-container-configurator/">custom container questionnaire</a> gathers requirements for a quote.
        </figcaption>
      </figure>
      <figure>
        <img src={`${mediaPath}/motor-result.jpg`} width="780" height="576" loading="lazy"
          alt="Updated stainless steel air motor bundle with a 1:2 gearbox, smooth 14 mm drive hub, mounting plate and speed sensor preparation, priced at 3,258.95 euros excluding VAT."/>
        <figcaption>
          The <a href="https://ptm-mechatronics.com/product/druckluftmotor-konfigurator-edelstahlmotor-mit-atex-zone-1-ip68-und-reinraumzertifikat/">stainless steel air motor configurator</a> shows the matched components, total price and Add to cart button.
        </figcaption>
      </figure>
    </section>
  );
}
