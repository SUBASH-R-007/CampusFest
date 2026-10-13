import { Link } from "react-router-dom";
import { useResource } from "../hooks/useResource";
import { useSession } from "../hooks/Session";
import {
  PageHeading,
  Loading,
  ErrorAlert,
  Icon,
  Empty,
  Badge,
} from "../components/UI";
import EventChart from "../components/EventChart";
import { dateTime } from "../utils/format";
export default function Dashboard() {
  const { data, loading, error } = useResource("/organizer/dashboard");
  const { session } = useSession();
  if (loading) return <Loading />;
  if (error) return <ErrorAlert error={error} />;
  const metrics = [
    ["Your events", data.stats.events, "Across all lifecycle states"],
    ["Confirmed units", data.stats.confirmed, "Solo registrations + teams"],
    [
      "Waiting list units",
      data.stats.waitlisted,
      "In first-in, first-out order",
    ],
    ["Participants", data.stats.participants, "Active participant headcount"],
    ["Checked in", data.stats.checkedIn, "Individual attendance records"],
  ];
  return (
    <>
      <PageHeading
        eyebrow="YOUR CAMPUS, IN MOTION"
        title={`Hello, ${session.organizer.name.split(" ")[0]}.`}
        action={
          <Link className="btn btn-primary" to="/organizer/events/new">
            <Icon name="plus" />
            Create event
          </Link>
        }
      >
        Here’s what’s happening across your events.
      </PageHeading>
      <div className="metrics-grid">
        {metrics.map(([label, value, hint]) => (
          <div className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{hint}</small>
          </div>
        ))}
      </div>
      <div className="surface">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE BIG PICTURE</p>
            <h2 className="h4">Registrations at a glance</h2>
          </div>
          <Badge value="published">Live data</Badge>
        </div>
        {data.events.length ? (
          <EventChart events={data.events} />
        ) : (
          <Empty
            title="Make something happen"
            action={
              <Link className="btn btn-primary" to="/organizer/events/new">
                Create your first event
              </Link>
            }
          >
            Your events and their real registration counts will appear here.
          </Empty>
        )}
      </div>
      <div className="surface mt-4">
        <div className="section-heading">
          <h2 className="h4">Your event desk</h2>
          <Link to="/organizer/events" className="text-link">
            Manage events
            <Icon />
          </Link>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Schedule</th>
                <th>Status</th>
                <th>Attendance</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.title}</strong>
                    <small className="d-block text-muted">
                      {e.mode === "TEAM" ? "Team" : "Solo"} · {e.capacity}{" "}
                      {e.unit}
                    </small>
                  </td>
                  <td>{dateTime(e.startAt)} IST</td>
                  <td>
                    <Badge value={e.status} />
                  </td>
                  <td>
                    {e.checkedInCount} / {e.participantCount} participants
                  </td>
                  <td>
                    <Link to={`/organizer/events/${e.id}/participants`}>
                      View roster
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
