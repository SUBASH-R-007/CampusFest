import { Link } from "react-router-dom";
import { availability, shortDate, dateTime } from "../utils/format";
import { Icon } from "./UI";
export default function EventCard({ event }) {
  return (
    <article className="event-card">
      <Link
        className="event-card-image"
        to={`/events/${event.slug}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        <img src={event.image || "/images/campus.jpg"} alt="" loading="lazy" />
        <span className="date-chip">{shortDate(event.startAt)}</span>
        <span className="image-category">{event.category}</span>
      </Link>
      <div className="event-card-body">
        <div className="card-meta">
          <span>{event.mode === "TEAM" ? "Team event" : "Solo event"}</span>
          <span className={`availability-dot ${event.availability}`}>
            {availability(event)}
          </span>
        </div>
        <h3>
          <Link to={`/events/${event.slug}`}>{event.title}</Link>
        </h3>
        <p className="event-description">{event.description}</p>
        <div className="event-location">
          <Icon name="pin" size={16} />
          {event.venue}
        </div>
        <div className="event-card-bottom">
          <time dateTime={event.startAt}>
            {dateTime(event.startAt, {
              year: undefined,
              month: undefined,
              day: undefined,
            })}{" "}
            IST
          </time>
          <Link to={`/events/${event.slug}`} className="text-link">
            {event.availability === "waitlist"
              ? "Join waiting list"
              : "View event"}
            <Icon size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}
