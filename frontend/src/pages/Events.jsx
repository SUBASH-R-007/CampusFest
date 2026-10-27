import { Link, useParams, useSearchParams } from "react-router-dom";
import { useResource } from "../hooks/useResource";
import EventCard from "../components/EventCard";
import {
  ErrorAlert,
  Loading,
  PageHeading,
  Field,
  Empty,
  Icon,
} from "../components/UI";
import { filterEvents, availability, dateTime } from "../utils/format";
import { assetPath, STATIC_PREVIEW } from "../utils/hosting";
export function Events() {
  const { data, loading, error } = useResource("/events");
  const [params, setParams] = useSearchParams();
  const change = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const events = filterEvents(data || [], params);
  return (
    <div className="container page-space">
      <PageHeading eyebrow="GET OUT THERE" title="Find your next experience.">
        A stage for your ideas. A place for your people.
      </PageHeading>
      <div className="explorer-filters">
        <Field
          label="Search events"
          value={params.get("q") || ""}
          onChange={(e) => change("q", e.target.value)}
          placeholder="Event name, venue, or interest"
        />
        <Field
          label="Category"
          value={params.get("category") || ""}
          onChange={(e) => change("category", e.target.value)}
        >
          <option value="">All categories</option>
          {[...new Set((data || []).map((e) => e.category))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Field>
        <Field
          label="Participation"
          value={params.get("mode") || ""}
          onChange={(e) => change("mode", e.target.value)}
        >
          <option value="">Solo & team</option>
          <option value="SOLO">Solo</option>
          <option value="TEAM">Team</option>
        </Field>
        <Field
          label="When"
          value={params.get("period") || "upcoming"}
          onChange={(e) => change("period", e.target.value)}
        >
          <option value="upcoming">Upcoming & ongoing</option>
          <option value="past">Past events</option>
          <option value="all">All dates</option>
        </Field>
        <Field
          label="Sort by"
          value={params.get("sort") || "soonest"}
          onChange={(e) => change("sort", e.target.value)}
        >
          <option value="soonest">Soonest first</option>
          <option value="latest">Latest first</option>
        </Field>
      </div>
      <ErrorAlert error={error} />
      {loading ? (
        <Loading />
      ) : (
        <>
          <p className="results-count">
            {events.length} experience{events.length === 1 ? "" : "s"} found{" "}
            <span>· All times IST</span>
          </p>
          {events.length ? (
            <div className="row g-4">
              {events.map((e) => (
                <div className="col-md-6 col-lg-4" key={e.id}>
                  <EventCard event={e} />
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="No matches this time"
              action={
                <button
                  className="btn btn-primary"
                  onClick={() => setParams({})}
                >
                  Reset filters
                </button>
              }
            >
              Try another interest or explore all experiences.
            </Empty>
          )}
        </>
      )}
    </div>
  );
}
export function EventDetails() {
  const { slug } = useParams();
  const {
    data: event,
    loading,
    error,
  } = useResource(`/events/${encodeURIComponent(slug)}`);
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="container page-space">
        <ErrorAlert error={error} />
        <Link to="/events">Back to events</Link>
      </div>
    );
  return (
    <div className="container page-space">
      <Link className="back-link" to="/events">
        ← All experiences
      </Link>
      <div className="detail-heading">
        <p className="eyebrow">
          {event.category} ·{" "}
          {event.mode === "TEAM" ? "TEAM EXPERIENCE" : "SOLO EXPERIENCE"}
        </p>
        <h1>{event.title}</h1>
        <p>
          <Icon name="pin" />
          {event.venue}
          <span className="mx-3">/</span>
          {dateTime(event.startAt)} IST
        </p>
      </div>
      <img
        className="detail-photo"
        src={assetPath(event.image)}
        alt={`${event.category} event atmosphere`}
      />
      <div className="detail-grid">
        <div>
          <section className="detail-section">
            <p className="eyebrow">THE EXPERIENCE</p>
            <h2>Here’s what’s happening.</h2>
            <p className="preserve-lines">{event.description}</p>
          </section>
          <section className="detail-section">
            <h3>Know before you go</h3>
            <p className="preserve-lines">
              {event.rules || "Bring your confirmed pass and arrive on time."}
            </p>
            <dl className="details-list">
              <div>
                <dt>Starts</dt>
                <dd>{dateTime(event.startAt)} IST</dd>
              </div>
              <div>
                <dt>Ends</dt>
                <dd>{dateTime(event.endAt)} IST</dd>
              </div>
              <div>
                <dt>Venue</dt>
                <dd>{event.venue}</dd>
              </div>
              <div>
                <dt>Organizer contact</dt>
                <dd>{event.contact}</dd>
              </div>
              {event.mode === "TEAM" && (
                <div>
                  <dt>Team size</dt>
                  <dd>
                    {event.minTeamSize}–{event.maxTeamSize} people, including
                    the leader
                  </dd>
                </div>
              )}
            </dl>
          </section>
        </div>
        <aside className="registration-panel">
          <span className={`availability-dot ${event.availability}`}>
            {availability(event)}
          </span>
          <h3>{event.canRegister ? "Be part of it." : "Stay in the loop."}</h3>
          {STATIC_PREVIEW ? (
            <p>
              Illustrative capacity: {event.capacity} {event.unit}. No live
              registrations.
            </p>
          ) : (
            <p>
              {event.confirmedCount} of {event.capacity} {event.unit} confirmed
            </p>
          )}
          <div className="capacity-track">
            <span
              style={{
                width: `${Math.min(100, (event.confirmedCount / event.capacity) * 100)}%`,
              }}
            />
          </div>
          <dl className="details-list compact">
            <div>
              <dt>Registration opens</dt>
              <dd>{dateTime(event.registrationOpensAt)} IST</dd>
            </div>
            <div>
              <dt>Registration closes</dt>
              <dd>{dateTime(event.registrationDeadline)} IST</dd>
            </div>
          </dl>
          {event.canRegister ? (
            <Link
              className="btn btn-primary w-100"
              to={`/events/${event.slug}/register`}
            >
              {event.availability === "waitlist"
                ? "Join waiting list"
                : "Register for this event"}
              <Icon />
            </Link>
          ) : (
            <button className="btn btn-secondary w-100" disabled>
              {STATIC_PREVIEW
                ? "Registration unavailable in preview"
                : "Registration closed"}
            </button>
          )}
          <p className="small mt-3 mb-0">
            {event.mode === "TEAM"
              ? "Capacity counts whole teams. Your leader counts toward team size."
              : "One registration reserves one seat."}{" "}
            When full, you join the waiting list in order. Spaces are offered
            automatically before the event starts, even after registration
            closes.
          </p>
          <Link className="text-link mt-3" to="/my-pass">
            Already registered? Find your pass
            <Icon size={16} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
