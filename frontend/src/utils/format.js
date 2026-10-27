export const ZONE = "Asia/Kolkata";
export function dateTime(value, options = {}) {
  return value
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: ZONE,
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        ...options,
      }).format(new Date(value))
    : "—";
}
export function shortDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: ZONE,
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}
export function inputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() + 330 * 60000).toISOString().slice(0, 16);
}
export function utcDate(value) {
  return value ? new Date(`${value}:00+05:30`).toISOString() : "";
}
export function availability(event) {
  if (event.preview) return "Sample event";
  if (!event.canRegister || event.availability === "closed")
    return "Registration closed";
  if (event.availability === "waitlist") return "Waiting list open";
  return `${event.availableUnits} ${event.unit} available`;
}
export function registrationLabel(registration, event) {
  return event.status === "cancelled"
    ? "Event cancelled"
    : {
        CONFIRMED: "Confirmed",
        WAITLISTED: "Waitlisted",
        CANCELLED: "Cancelled",
      }[registration.status] || registration.status;
}
export function isBeforeStart(event) {
  return new Date(event.serverNow || Date.now()) < new Date(event.startAt);
}
export function filterEvents(events, params) {
  const search = (params.get("q") || "").trim().toLowerCase();
  return events
    .filter(
      (e) =>
        (!search ||
          `${e.title} ${e.description} ${e.venue}`
            .toLowerCase()
            .includes(search)) &&
        (!params.get("category") || e.category === params.get("category")) &&
        (!params.get("mode") || e.mode === params.get("mode")) &&
        (params.get("period") === "all" ||
          (params.get("period") === "past"
            ? e.phase === "completed"
            : e.phase !== "completed")),
    )
    .sort(
      (a, b) =>
        (new Date(a.startAt) - new Date(b.startAt)) *
        (params.get("sort") === "latest" ? -1 : 1),
    );
}
