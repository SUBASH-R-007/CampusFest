import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useResource } from "../hooks/useResource";
import { useSession } from "../hooks/Session";
import EventCard from "../components/EventCard";
import { Icon, ErrorAlert, Loading } from "../components/UI";
import { shortDate } from "../utils/format";
export default function Home() {
  const { data: events, loading, error } = useResource("/events");
  const { session } = useSession();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const upcoming = (events || [])
    .filter((e) => e.phase !== "completed" && e.status === "published")
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  const featured = upcoming.find((e) => e.mode === "TEAM") || upcoming[0];
  const categories = [...new Set((events || []).map((e) => e.category))];
  return (
    <>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-dot" />
              {session?.config?.campusName || "YOUR CAMPUS. YOUR PEOPLE."}
            </p>
            <h1>
              Good things
              <br />
              happen{" "}
              <span>
                on
                <br className="desktop-break" /> campus.
              </span>
            </h1>
            <p className="hero-description">
              Big ideas. Friendly competition. Unforgettable evenings. Find your
              people and make your next campus memory.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/events">
                Explore events
                <Icon />
              </Link>
              <Link className="text-link" to="/my-pass">
                Already registered? <Icon name="ticket" />
              </Link>
            </div>
            <div className="hero-note">
              <span className="mini-star" aria-hidden="true">
                ✳
              </span>
              <span>
                No student account needed.
                <br />
                <strong>Just a little curiosity.</strong>
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-photo">
              <img
                src="/images/campus.jpg"
                alt="A warm campus library with tall shelves and study spaces"
                fetchPriority="high"
              />
              <div className="photo-caption">
                <span>OUTSIDE THE CLASSROOM.</span>
                <span>INTO YOUR ELEMENT.</span>
              </div>
            </div>
            <div className="hero-sticker" aria-hidden="true">
              MAKE
              <br />
              IT A<br />
              <i>memory.</i>
            </div>
            {featured && (
              <Link className="featured-panel" to={`/events/${featured.slug}`}>
                <span className="featured-date">
                  {shortDate(featured.startAt)}
                </span>
                <span>
                  <small>ON OUR RADAR</small>
                  <strong>{featured.title}</strong>
                  <span>
                    {featured.category} · {featured.venue}
                  </span>
                </span>
                <Icon size={26} />
              </Link>
            )}
          </div>
        </div>
      </section>
      <section className="discovery-bar">
        <div className="container discovery-inner">
          <span className="eyebrow mb-0">
            YOUR NEXT GREAT STORY STARTS HERE
          </span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/events?q=${encodeURIComponent(query)}`);
            }}
            className="home-search"
          >
            <Icon name="search" />
            <label htmlFor="home-search" className="visually-hidden">
              Search events
            </label>
            <input
              id="home-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find an event that feels like you"
            />
            <button aria-label="Search events">
              <Icon />
            </button>
          </form>
        </div>
      </section>
      <section className="section-space container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A LITTLE SOMETHING FOR EVERYONE</p>
            <h2>Find your thing.</h2>
          </div>
          <Link to="/events" className="text-link">
            All events
            <Icon />
          </Link>
        </div>
        <div className="category-row">
          <Link to="/events" className="category-chip selected">
            All experiences <Icon size={15} />
          </Link>
          {categories.map((c) => (
            <Link
              className="category-chip"
              key={c}
              to={`/events?category=${encodeURIComponent(c)}`}
            >
              {c}
            </Link>
          ))}
        </div>
        <ErrorAlert error={error} />
        {loading ? (
          <Loading text="Finding your next experience…" />
        ) : (
          <div className="row g-4">
            {upcoming.slice(0, 3).map((e) => (
              <div className="col-md-6 col-lg-4" key={e.id}>
                <EventCard event={e} />
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="how-section">
        <div className="container how-grid">
          <div>
            <p className="eyebrow">LESS ADMIN. MORE EXPERIENCE.</p>
            <h2>
              Your next event,
              <br />
              three small steps.
            </h2>
            <p>No account. No complicated process.</p>
          </div>
          <div className="steps">
            <div>
              <span>01</span>
              <div>
                <h3>Discover your next thing</h3>
                <p>
                  Browse what’s happening and find an event that sparks your
                  curiosity.
                </p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <h3>Make it official</h3>
                <p>
                  Register solo or bring your team. Save your pass ID and
                  private management code.
                </p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <h3>Show up. Get involved.</h3>
                <p>
                  Bring your confirmed pass. If you’re waiting, check your place
                  as spaces open up.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="container bottom-callout">
        <span className="eyebrow">
          CAMPUS IS BETTER WHEN YOU’RE PART OF IT.
        </span>
        <h2>See you there.</h2>
        <Link className="btn btn-dark" to="/events">
          Find an experience
          <Icon />
        </Link>
      </section>
    </>
  );
}
