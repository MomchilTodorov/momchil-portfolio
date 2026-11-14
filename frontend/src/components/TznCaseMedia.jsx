import CaseWalkthrough from './CaseWalkthrough.jsx';

const mediaPath = '/assets/work/tzn';

export const tznHomepage = `${mediaPath}/homepage.webp`;
export const tznFilmRecording = `${mediaPath}/agency-film`;

export function TznCaseMedia() {
  return (
    <section className="case-examples" aria-labelledby="tzn-examples-heading">
      <h2 id="tzn-examples-heading">Website highlights</h2>
      <CaseWalkthrough recording={tznFilmRecording} width={960} height={540}
        alt="tzn logo on the agency film’s title card." caption="Excerpt from the tzn Digital agency film."/>
      <figure>
        <img src={`${mediaPath}/project-filters.webp`} width="1920" height="924" loading="lazy"
          alt="The project directory filtered to Sport, showing T-Gym and Powerbreather."/>
        <figcaption>Industry filters on the project directory.</figcaption>
      </figure>
      <figure>
        <img src={`${mediaPath}/article-video.webp`} width="1920" height="956" loading="lazy"
          alt="An article with an embedded video on the left and a table of contents on the right."/>
        <figcaption>Article layout with an embedded video.</figcaption>
      </figure>
      <CaseWalkthrough recording={`${mediaPath}/walkthrough`} alt="The tzn Digital homepage with a dark green hero."
        caption="Scroll walkthrough of the tzn Digital homepage."/>
      <CaseWalkthrough recording={`${mediaPath}/article-walkthrough`} alt="The e-commerce glossary article with its sidebar table of contents."
        caption="Walkthrough of the e-commerce glossary article and its table of contents."/>
    </section>
  );
}
