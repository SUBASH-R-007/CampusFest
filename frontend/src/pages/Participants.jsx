import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useResource } from "../hooks/useResource";
import {
  PageHeading,
  ErrorAlert,
  Loading,
  Badge,
  Field,
  Icon,
  Empty,
  Button,
} from "../components/UI";
import RegistrationDetail from "../components/RegistrationDetail";
export default function Participants() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState(null);
  const query = params.toString();
  const { data, loading, error, refresh } = useResource(
    `/organizer/events/${id}/registrations${query ? `?${query}` : ""}`,
  );
  const change = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const registrations = data?.registrations || [];
  const queue = registrations
    .filter((r) => r.status === "WAITLISTED")
    .sort((a, b) => a.sequence - b.sequence);
  return (
    <>
      <Link className="back-link" to="/organizer/events">
        ← My events
      </Link>
      <PageHeading
        eyebrow="PEOPLE MAKE THE EVENT"
        title={data?.event.title || "Participants"}
        action={
          data && (
            <a
              className="btn btn-outline-dark"
              href={`/api/organizer/events/${id}/export.csv${query ? `?${query}` : ""}`}
            >
              <Icon name="download" />
              Export CSV
            </a>
          )
        }
      >
        Registration units and individual participants, in one place.
      </PageHeading>
      {data && (
        <div className="roster-summary">
          <span>
            <strong>{data.event.confirmedCount}</strong> confirmed{" "}
            {data.event.unit}
          </span>
          <span>
            <strong>{data.event.waitlistedCount}</strong> waiting-list units
          </span>
          <span>
            <strong>{data.event.checkedInCount}</strong> checked in
          </span>
        </div>
      )}
      <div className="roster-filters">
        <Field
          label="Search participants"
          value={params.get("search") || ""}
          onChange={(e) => change("search", e.target.value)}
          placeholder="Name, pass ID, student ID, email, or team"
        />
        <Field
          label="Registration status"
          value={params.get("status") || ""}
          onChange={(e) => change("status", e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="WAITLISTED">Waitlisted</option>
          <option value="CANCELLED">Cancelled</option>
        </Field>
        <Field
          label="Attendance"
          value={params.get("attendance") || "any"}
          onChange={(e) => change("attendance", e.target.value)}
        >
          <option value="any">Any attendance</option>
          <option value="checked-in">Checked in</option>
          <option value="not-checked-in">Not checked in</option>
        </Field>
      </div>
      <p className="small text-muted">
        CSV exports use these same filters, with one row per participant in each
        matching registration, including every team member. Team details open
        the full registration.
      </p>
      <ErrorAlert error={error} />
      {loading ? (
        <Loading />
      ) : registrations.length ? (
        <div className="surface p-0 overflow-hidden">
          <div className="table-responsive">
            <table className="table roster-table">
              <caption>
                {registrations.length} matching registration units · Click a
                pass ID to inspect a registration.
              </caption>
              <thead>
                <tr>
                  <th>Pass / team</th>
                  <th>Participants</th>
                  <th>Status</th>
                  <th>Attendance</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.passId}>
                    <td>
                      <button
                        className="table-link"
                        onClick={() => setSelected(r)}
                      >
                        {r.passId}
                      </button>
                      {r.teamName && (
                        <span className="d-block">{r.teamName}</span>
                      )}
                    </td>
                    <td>
                      {r.members.map((m) => (
                        <div className="roster-person" key={m.id}>
                          <strong>{m.name}</strong>
                          <small>
                            {m.studentId} · {m.department}
                          </small>
                        </div>
                      ))}
                    </td>
                    <td>
                      <Badge value={r.status} />
                      {r.status === "WAITLISTED" && (
                        <small className="d-block mt-2">
                          Queue #{r.waitlistPosition}
                        </small>
                      )}
                    </td>
                    <td>
                      {r.members.filter((m) => m.attendance).length}/
                      {r.members.length} checked in
                    </td>
                    <td>
                      <Button
                        variant="outline-dark"
                        className="btn-sm"
                        onClick={() => setSelected(r)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <Empty
          title="No matching participants"
          action={
            <Button variant="outline-dark" onClick={() => setParams({})}>
              Clear filters
            </Button>
          }
        >
          New registrations will appear here. Try adjusting your search.
        </Empty>
      )}
      {queue.length > 0 && (
        <section className="surface mt-4">
          <h2 className="h4">Waiting list · first in, first out</h2>
          <p className="small text-muted">
            Filtered results retain their current overall queue position.
            Existing entries can be promoted before event start even after new
            registrations close.
          </p>
          <ol className="queue-list">
            {queue.map((r) => (
              <li key={r.passId}>
                <span>#{r.waitlistPosition}</span>
                <strong>{r.teamName || r.members[0]?.name}</strong>
                <button className="text-link" onClick={() => setSelected(r)}>
                  {r.passId}
                  <Icon size={15} />
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
      {selected && (
        <RegistrationDetail
          registration={selected}
          event={data.event}
          onClose={() => setSelected(null)}
          onChange={refresh}
        />
      )}
    </>
  );
}
