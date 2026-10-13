import { useState } from "react";
import { useResource } from "../hooks/useResource";
import { api } from "../services/api";
import { dateTime } from "../utils/format";
import {
  PageHeading,
  ErrorAlert,
  Loading,
  Field,
  Button,
  Icon,
  Badge,
} from "../components/UI";
import RegistrationDetail from "../components/RegistrationDetail";
function AttendanceDesk({ event, refreshEvents }) {
  const [passId, setPassId] = useState("");
  const [match, setMatch] = useState(null);
  const [matchedEvent, setMatchedEvent] = useState(event);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function find(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMatch(null);
    try {
      const data = await api(
        `/organizer/events/${event.id}/registrations?search=${encodeURIComponent(passId.trim())}`,
      );
      const found = data.registrations.find(
        (r) => r.passId.toLowerCase() === passId.trim().toLowerCase(),
      );
      if (!found)
        throw new Error(
          "No exact pass ID matches this event. Check the ID and selected event.",
        );
      setMatchedEvent(data.event);
      setMatch(found);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="attendance-event">
        <div>
          <Badge value={event.status} />
          <h2>{event.title}</h2>
          <p>
            {dateTime(event.startAt)} IST · {event.venue}
          </p>
        </div>
        <div>
          <strong>{event.checkedInCount}</strong>
          <span>participants checked in</span>
        </div>
      </div>
      {event.status !== "published" || event.phase === "upcoming" ? (
        <div className="notice">
          Check-in opens when a published event starts. Draft, cancelled, and
          archived events cannot accept new attendance.
        </div>
      ) : null}
      <form className="surface attendance-form" onSubmit={find}>
        <span className="lookup-icon">
          <Icon name="ticket" size={28} />
        </span>
        <h2 className="h4">Ready when they are.</h2>
        <p className="text-muted">
          Enter a pass ID to review the registration. Attendance changes only
          when you select a participant’s check-in action.
        </p>
        <ErrorAlert error={error} />
        <Field
          label="Registration / pass ID"
          required
          value={passId}
          onChange={(e) => setPassId(e.target.value)}
          placeholder="CF-…"
          autoComplete="off"
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Finding registration…" : "Find registration"}
          <Icon name="search" />
        </Button>
      </form>
      {match && (
        <RegistrationDetail
          registration={match}
          event={matchedEvent}
          attendanceMode
          onClose={() => setMatch(null)}
          onChange={refreshEvents}
        />
      )}
    </>
  );
}
export default function Attendance() {
  const {
    data: events,
    loading,
    error,
    refresh,
  } = useResource("/organizer/events");
  const [eventId, setEventId] = useState("");
  const selected = events?.find((e) => e.id === eventId);
  return (
    <>
      <PageHeading eyebrow="THE MOMENT THEY ARRIVE" title="Attendance">
        One pass. Every participant. A clear record of who showed up.
      </PageHeading>
      <ErrorAlert error={error} />
      {loading && !events ? (
        <Loading />
      ) : (
        <>
          <div className="surface mb-4">
            <Field
              label="Select your event"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">Choose an event</option>
              {events?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} · {e.phase} · {e.status}
                </option>
              ))}
            </Field>
          </div>
          {selected ? (
            <AttendanceDesk
              key={selected.id}
              event={selected}
              refreshEvents={refresh}
            />
          ) : (
            <div className="empty-state">
              <Icon name="calendar" size={32} />
              <h2 className="h4">Choose an event to open the desk.</h2>
              <p>
                The seeded ongoing event is ready for an attendance
                demonstration.
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
