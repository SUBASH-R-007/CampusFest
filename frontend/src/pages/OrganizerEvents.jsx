import { useState } from "react";
import { Link } from "react-router-dom";
import { useResource } from "../hooks/useResource";
import { post } from "../services/api";
import { dateTime } from "../utils/format";
import {
  PageHeading,
  ErrorAlert,
  Loading,
  Badge,
  Button,
  Confirmation,
  TextArea,
  Icon,
  Empty,
} from "../components/UI";
export default function OrganizerEvents() {
  const {
    data: events,
    loading,
    error,
    refresh,
  } = useResource("/organizer/events");
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  async function apply() {
    setBusy(true);
    setActionError(null);
    try {
      await post(`/organizer/events/${action.event.id}/action`, {
        action: action.type,
        ...(action.type === "cancel" ? { reason } : {}),
      });
      setAction(null);
      setReason("");
      refresh();
    } catch (e) {
      setActionError(e);
    } finally {
      setBusy(false);
    }
  }
  function open(event, type) {
    setAction({ event, type });
    setActionError(null);
    setReason("");
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE IT HAPPEN"
        title="Your events"
        action={
          <Link className="btn btn-primary" to="/organizer/events/new">
            <Icon name="plus" />
            Create event
          </Link>
        }
      >
        Plan the details. Open the doors. Bring people together.
      </PageHeading>
      <ErrorAlert error={error} />
      {loading ? (
        <Loading />
      ) : !events?.length ? (
        <Empty
          title="Your next campus moment starts here"
          action={
            <Link to="/organizer/events/new" className="btn btn-primary">
              Create event
            </Link>
          }
        >
          Create a draft, check the details, then publish it.
        </Empty>
      ) : (
        <div className="organizer-event-list">
          {events.map((e) => (
            <article className="organizer-event" key={e.id}>
              <img src={e.image} alt="" />
              <div className="organizer-event-info">
                <div className="d-flex flex-wrap gap-2 mb-2">
                  <Badge value={e.status} />
                  <span className="small text-muted">
                    {e.phase} · {e.mode === "TEAM" ? "Team" : "Solo"}
                  </span>
                </div>
                <h2>{e.title}</h2>
                <p>
                  {dateTime(e.startAt)} IST · {e.venue}
                </p>
                <p className="small">
                  {e.confirmedCount}/{e.capacity} {e.unit} confirmed ·{" "}
                  {e.waitlistedCount} waitlisted · New registrations{" "}
                  {e.registrationsEnabled ? "enabled" : "closed"}
                </p>
                <div className="event-management-actions">
                  {!["cancelled", "archived"].includes(e.status) && (
                    <Link
                      className="btn btn-sm btn-outline-dark"
                      to={`/organizer/events/${e.id}/edit`}
                    >
                      Edit details
                    </Link>
                  )}
                  <Link
                    className="btn btn-sm btn-primary"
                    to={`/organizer/events/${e.id}/participants`}
                  >
                    Participants
                  </Link>
                  {e.status === "draft" && (
                    <Button
                      variant="outline-dark"
                      className="btn-sm"
                      onClick={() => open(e, "publish")}
                    >
                      Publish
                    </Button>
                  )}
                  {e.status === "published" && (
                    <>
                      <Button
                        variant="outline-dark"
                        className="btn-sm"
                        disabled={
                          !e.registrationsEnabled && e.phase !== "upcoming"
                        }
                        onClick={() =>
                          open(e, e.registrationsEnabled ? "close" : "reopen")
                        }
                      >
                        {e.registrationsEnabled
                          ? "Close registrations"
                          : "Reopen registrations"}
                      </Button>
                      <Button
                        variant="outline-danger"
                        className="btn-sm"
                        onClick={() => open(e, "cancel")}
                      >
                        Cancel event
                      </Button>
                    </>
                  )}
                  {e.status === "draft" && (
                    <Button
                      variant="outline-danger"
                      className="btn-sm"
                      onClick={() => open(e, "cancel")}
                    >
                      Cancel event
                    </Button>
                  )}
                  {e.status !== "archived" &&
                    (e.phase === "completed" || e.status === "cancelled") && (
                      <Button
                        variant="outline-dark"
                        className="btn-sm"
                        onClick={() => open(e, "archive")}
                      >
                        Archive
                      </Button>
                    )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {action && (
        <Confirmation
          title={`${action.type.charAt(0).toUpperCase() + action.type.slice(1)} ${action.type === "close" || action.type === "reopen" ? "registrations" : "event"}?`}
          label={`Confirm ${action.type}`}
          onCancel={() => setAction(null)}
          onConfirm={apply}
          busy={busy}
          error={actionError}
        >
          <p>
            <strong>{action.event.title}</strong>
          </p>
          {action.type === "cancel" ? (
            <>
              <p>
                This cancels all active registrations, preserves history, and
                does not promote anyone from the waiting list.
              </p>
              <TextArea
                label="Cancellation reason"
                required
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </>
          ) : action.type === "close" ? (
            <p>
              New registrations will close. Existing waiting-list entries can
              still be promoted before the event starts.
            </p>
          ) : action.type === "reopen" ? (
            <p>
              New registrations are still subject to the event’s opening time
              and deadline.
            </p>
          ) : action.type === "publish" ? (
            <p>
              This event will become visible to students. Registrations follow
              the configured window.
            </p>
          ) : (
            <p>
              The event moves to your archive. Its registration and attendance
              history is preserved.
            </p>
          )}
        </Confirmation>
      )}
    </>
  );
}
