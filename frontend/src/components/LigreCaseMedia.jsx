import CaseWalkthrough from './CaseWalkthrough.jsx';

const mediaPath = '/assets/work/ligre';

export const ligreHomeRecording = `${mediaPath}/homepage-walkthrough`;

export default function LigreCaseMedia() {
  return (
    <section className="case-examples" aria-labelledby="ligre-examples-heading">
      <h2 id="ligre-examples-heading">Storefront highlights</h2>
      <CaseWalkthrough recording={ligreHomeRecording} alt="The LIGRE homepage featuring an espresso machine."
        caption="Scroll walkthrough of the LIGRE homepage."/>
      <figure>
        <img src={`${mediaPath}/product-configurator.webp`} width="1920" height="958" loading="lazy"
          alt="LIGRE youn espresso machine with options for finish, accessories, and power plug."/>
        <figcaption>Product configurator for the LIGRE youn espresso machine.</figcaption>
      </figure>
      <figure>
        <img src={`${mediaPath}/accessories-catalog.webp`} width="1920" height="960" loading="lazy"
          alt="Accessories catalog showing portafilters and tamper mats in different finishes."/>
        <figcaption>Accessories catalog with product galleries and availability.</figcaption>
      </figure>
      <figure>
        <img src={`${mediaPath}/checkout.webp`} width="1920" height="960" loading="lazy"
          alt="Checkout showing customer and shipping fields next to the order summary."/>
        <figcaption>Checkout with options for private and business customers.</figcaption>
      </figure>
      <CaseWalkthrough recording={`${mediaPath}/store-finder-walkthrough`}
        alt="The LIGRE store finder showing a list of retailers next to a map."
        caption="Store finder walkthrough showing how the retailer list and map work together."/>
    </section>
  );
}
