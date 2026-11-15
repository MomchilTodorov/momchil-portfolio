import CaseWalkthrough from './CaseWalkthrough.jsx';

const mediaPath = '/assets/work/elfbar';

export const elfbarStorefrontRecording = `${mediaPath}/storefront-walkthrough`;

export default function ElfbarCaseMedia() {
  return (
    <section className="case-examples" aria-labelledby="elfbar-examples-heading">
      <h2 id="elfbar-examples-heading">Storefront highlights</h2>
      <CaseWalkthrough recording={elfbarStorefrontRecording}
        alt="The Elfbar storefront showing product categories and navigation."
        caption="Walkthrough of the storefront, product listings and bundle configurator."/>
      <figure>
        <picture className="elfbar-cart">
          <source media="(max-width: 720px)" srcSet={`${mediaPath}/cart-drawer-mobile.webp`}
            width="558" height="1265"/>
          <img src={`${mediaPath}/cart-drawer.webp`} width="2540" height="1265" loading="lazy"
            alt="Open ELFBAR cart drawer with plus and minus quantity controls for two products."/>
        </picture>
        <figcaption>Cart drawer with quantity controls, product recommendations and a discount code field.</figcaption>
      </figure>
      <figure>
        <img src={`${mediaPath}/about.webp`} width="1920" height="958" loading="lazy"
          alt="Elfbar About page with a photo of the fulfillment team packing orders."/>
        <figcaption>About page introducing the store and its fulfillment team.</figcaption>
      </figure>
      <figure>
        <img src={`${mediaPath}/loyalty-and-footer.webp`} width="1920" height="956" loading="lazy"
          alt="Store footer showing loyalty points, customer support links and a newsletter form."/>
        <figcaption>Loyalty signup, category links and customer support in the storefront footer.</figcaption>
      </figure>
    </section>
  );
}
