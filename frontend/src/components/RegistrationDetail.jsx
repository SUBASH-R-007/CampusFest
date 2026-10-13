import { useState } from "react";
import { post } from "../services/api";
import { isBeforeStart, dateTime } from "../utils/format";
import { Dialog, Button, Badge, Confirmation, ErrorAlert, Icon } from "./UI";
import { AccessDetails } from "../pages/Register";
export default function RegistrationDetail({
  registration: initial,
  event: initialEvent,
  onClose,
  onChange,
  attendanceMode = false,
}) {
  const [registration, setRegistration] = useState(initial);
  const [event, setEvent] = useState(initialEvent);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState(null);
  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState(null);
  async function mutate(path, body = {}) {
    setBusy(true);
    setError(null);
    try {
      const data = await post(
        `/organizer/registrations/${encodeURIComponent(registration.passId)}/${path}`,
        body,
      );
      if (data.registration) setRegistration(data.registration);
      if (data.event) setEvent(data.event);
      if (data.managementCode) setCode(data.managementCode);
      setAction(null);
      onChange?.();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const canCheck =
    event.status === "published" &&
    event.phase !== "upcoming" &&
    registration.status === "CONFIRMED";
  const canCancel =
    isBeforeStart(event) &&
    registration.status !== "CANCELLED" &&
    !registration.members.some((m) => m.attendance);
  return (
    <Dialog
      title={
        attendanceMode
          ? "Review participant attendance"
          : "Registration details"
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <ErrorAlert error={error} />
      <div className="registration-detail-head">
        <strong className="pass-id">{registration.passId}</strong>
        <Badge value={registration.status} />
      </div>
      <h3 className="h5 mt-3">
        {registration.teamName || registration.members[0]?.name}
      </h3>
      <p>{event.title}</p>
      {registration.status === "WAITLISTED" && (
        <p className="notice">
          Waiting list position <strong>{registration.waitlistPosition}</strong>
        </p>
      )}
      <p className="small text-muted">
        Registered {dateTime(registration.createdAt)} IST
      </p>
      {registration.members.map((m) => (
        <section className="member-detail" key={m.id}>
          <div>
            <strong>
              {m.name}
              {m.id === registration.leaderId && registration.teamName
                ? " · Leader"
                : ""}
            </strong>
            <span>
              {m.studentId} · {m.email}
            </span>
            <span>
              {m.department} · Year {m.year}
            </span>
            <small>
              {m.attendance
                ? `Checked in ${dateTime(m.attendance.at)} IST`
                : "Not checked in"}
            </small>
          </div>
          <div>
            {m.attendance ? (
              <Button
                variant="outline-danger"
                className="btn-sm"
                disabled={busy}
                onClick={() => setAction({ type: "undo", member: m })}
              >
                Undo check-in
              </Button>
            ) : (
              <Button
                variant="outline-dark"
                className="btn-sm"
                disabled={busy || !canCheck}
                onClick={() =>
                  mutate("attendance", { memberId: m.id, undo: false })
                }
              >
                <Icon name="check" size={16} />
                Check in
              </Button>
            )}
            {m.attendance && canCheck && (
              <button
                className="repeat-checkin"
                disabled={busy}
                onClick={() =>
                  mutate("attendance", { memberId: m.id, undo: false })
                }
              >
                Check in again (safe)
              </button>
            )}
          </div>
        </section>
      ))}
      {!canCheck && (
        <p className="small text-muted">
          New check-ins require a confirmed pass and a published event that has
          started. Event status and timing are checked again by the server.
        </p>
      )}
      <div className="d-flex flex-wrap gap-2 mt-4">
        <Button
          variant="outline-dark"
          disabled={busy}
          onClick={() => {
            setVerified(false);
            setAction({ type: "rotate" });
          }}
        >
          Issue new management code
        </Button>
        {canCancel && (
          <Button
            variant="outline-danger"
            disabled={busy}
            onClick={() => setAction({ type: "cancel" })}
          >
            Cancel registration
          </Button>
        )}
      </div>
      {code && (
        <AccessDetails passId={registration.passId} managementCode={code} />
      )}
      {action && (
        <Confirmation
          title={
            action.type === "rotate"
              ? "Issue a new private code?"
              : action.type === "undo"
                ? "Undo this check-in?"
                : "Cancel this registration?"
          }
          label={
            action.type === "rotate"
              ? "Issue new code"
              : action.type === "undo"
                ? "Undo check-in"
                : "Cancel registration"
          }
          busy={busy}
          confirmDisabled={action.type === "rotate" && !verified}
          error={error}
          onCancel={() => {
            setAction(null);
            setError(null);
          }}
          onConfirm={() =>
            action.type === "rotate"
              ? mutate("rotate-code", { verified: true })
              : action.type === "undo"
                ? mutate("attendance", {
                    memberId: action.member.id,
                    undo: true,
                  })
                : mutate("cancel")
          }
        >
          <p>
            {action.type === "rotate"
              ? "The old code stops working immediately. This recovery action is audited. Share the new code privately with the verified participant."
              : action.type === "undo"
                ? `Remove the attendance record for ${action.member.name}? This correction will be audited.`
                : `This cancels ${registration.teamName ? "the entire team" : "the participant"} and may promote the next eligible waiting-list entry. History is preserved.`}
          </p>
          {action.type === "rotate" && (
            <label>
              <input
                type="checkbox"
                className="form-check-input me-2"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
              />
              I have verified this participant in person.
            </label>
          )}
        </Confirmation>
      )}
    </Dialog>
  );
}
