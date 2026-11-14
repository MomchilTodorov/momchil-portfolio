import CaseWalkthrough from './CaseWalkthrough.jsx';

const mediaPath = '/assets/work/walhalla';

export const walhallaHomeRecording = `${mediaPath}/homepage-walkthrough`;

export default function WalhallaCaseMedia() {
  return (
    <section className="case-examples" aria-labelledby="walhalla-examples-heading">
      <h2 id="walhalla-examples-heading">Storefront highlights</h2>
      <CaseWalkthrough recording={walhallaHomeRecording}
        alt="Walhalla Weine homepage with its wine collection and store navigation."
        caption="Homepage walkthrough featuring wine categories, recommendations and producers."/>
      <figure>
        <img src={`${mediaPath}/homepage.webp`} width="1920" height="958" loading="lazy"
          alt="Walhalla Weine homepage with grapes in the hero and a preview of the wine categories."/>
        <figcaption>Homepage hero and entry point to the wine collection.</figcaption>
      </figure>
      <figure>
        <img src={`${mediaPath}/catalog-filters.webp`} width="1920" height="962" loading="lazy"
          alt="Wine catalog with sale products and filters for producer, grape variety, vintage and region."/>
        <figcaption>Catalog filters and product listings.</figcaption>
      </figure>
      <figure>
        <img src={`${mediaPath}/tasting-profile.webp`} width="1920" height="956" loading="lazy"
          alt="Wine details alongside scales for body, sweetness, acidity and tannins."/>
        <figcaption>Wine specifications and tasting profile on a product page.</figcaption>
      </figure>
      <figure>
        <img src={`${mediaPath}/cart-drawer.webp`} width="1920" height="946" loading="lazy"
          alt="Cart drawer with a wine item, subtotal and remaining amount for free shipping."/>
        <figcaption>Cart drawer with quantity controls and a free shipping threshold.</figcaption>
      </figure>
      <CaseWalkthrough recording={`${mediaPath}/about-walkthrough`}
        alt="Walhalla Weine About page with a wine-pouring photo and a section about the shop’s history."
        caption="About page walkthrough covering the shop’s history, services and location."/>
    </section>
  );
}
