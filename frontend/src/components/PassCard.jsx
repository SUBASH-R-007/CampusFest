import { dateTime, registrationLabel } from "../utils/format";
import { Badge, Icon } from "./UI";
export default function PassCard({ registration: r, event: e }) {
  return (
    <article className="pass-card printable-pass">
      <div className="pass-banner">
        <span>CampusFest.</span>
        <span>REGISTRATION PASS</span>
      </div>
      <div className="pass-body">
        <div className="pass-title">
          <div>
            <p className="eyebrow">{e.category}</p>
            <h2>{e.title}</h2>
          </div>
          <Badge value={e.status === "cancelled" ? "cancelled" : r.status}>
            {registrationLabel(r, e)}
          </Badge>
        </div>
        {r.status === "WAITLISTED" && (
          <div className="waitlist-warning">
            <strong>NOT A CONFIRMED ADMISSION PASS</strong>
            <p className="mb-0">
              Waiting list position: <strong>{r.waitlistPosition}</strong>.
              Check this pass again before attending.
            </p>
          </div>
        )}
        {(r.status === "CANCELLED" || e.status === "cancelled") && (
          <div className="alert alert-secondary">
            This registration is cancelled and does not permit entry.
            {r.cancellationReason && (
              <p className="mb-0">{r.cancellationReason}</p>
            )}
          </div>
        )}
        <dl className="pass-details">
          <div>
            <dt>Pass ID</dt>
            <dd className="pass-id">{r.passId}</dd>
          </div>
          <div>
            <dt>{r.teamName ? "Team name" : "Participant"}</dt>
            <dd>{r.teamName || r.members[0]?.name}</dd>
          </div>
          <div>
            <dt>Date & time</dt>
            <dd>{dateTime(e.startAt)} IST</dd>
          </div>
          <div>
            <dt>Venue</dt>
            <dd>{e.venue}</dd>
          </div>
        </dl>
        <h3 className="h6 mt-4">
          {r.teamName ? "Team roster" : "Participant details"}
        </h3>
        <div className="table-responsive">
          <table className="table pass-roster">
            <thead>
              <tr>
                <th>Name</th>
                <th>Student ID</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {r.members.map((m) => (
                <tr key={m.id || m.studentId}>
                  <td>
                    {m.name}
                    {m.id === r.leaderId && r.teamName && (
                      <small className="d-block text-muted">Team leader</small>
                    )}
                  </td>
                  <td>{m.studentId}</td>
                  <td>
                    {m.attendance ? (
                      <span className="attendance-yes">
                        <Icon name="check" size={15} /> Checked in
                        <small className="d-block">
                          {dateTime(m.attendance.at)} IST
                        </small>
                      </span>
                    ) : (
                      "Not checked in"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pass-footnote">
          {r.status === "CONFIRMED" && e.status !== "cancelled"
            ? "Bring this confirmed pass to the venue. Attendance is recorded by an organizer."
            : "This is a registration record only and does not permit admission."}{" "}
          All times: Asia/Kolkata (IST).
        </p>
      </div>
    </article>
  );
}
