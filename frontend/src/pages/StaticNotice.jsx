import { Link } from "react-router-dom";

export default function StaticNotice() {
  return (
    <section className="container narrow-page page-space">
      <p className="eyebrow">GITHUB PAGES PREVIEW</p>
      <h1>This feature needs the full application.</h1>
      <p className="lead">
        You can explore the design and sample events here. Registration, private
        passes, organizer login and attendance require the PHP backend, which is
        not hosted on GitHub Pages.
      </p>
      <p>
        This preview does not collect participant details or save registrations.
      </p>
      <div className="d-flex flex-wrap gap-3 mt-4">
        <Link to="/events" className="btn btn-primary">
          Explore sample events
        </Link>
        <a
          className="btn btn-outline-dark"
          href="https://github.com/SUBASH-R-007/CampusFest#readme"
        >
          Run the full project
        </a>
      </div>
    </section>
  );
}
