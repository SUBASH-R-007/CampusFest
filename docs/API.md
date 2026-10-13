# CampusFest API

All paths below are relative to `/api`. The React application uses a centralized Fetch wrapper, same-origin cookies, and JSON. The Vite development proxy forwards `/api` to PHP on port 8000 by default; set `CAMPUSFEST_API_TARGET` before starting Vite to select another local backend origin. Production serves the frontend and API from the same origin and needs no proxy override. There is no wildcard credentialed CORS.

## Response and session contract

```json
{"ok":true,"data":{"example":"value"}}
```

```json
{"ok":false,"error":{"code":"VALIDATION_ERROR","message":"Please check your details.","fieldErrors":{"title":"A title is required."}}}
```

Call `GET /session` before submitting forms. It returns a CSRF token, the current organizer or `null`, and public campus configuration. Send `X-CSRF-Token: <token>` and `Content-Type: application/json` on **every POST/PUT/PATCH request**, including login, anonymous registration, pass lookup, pass cancellation, and logout. Send `{}` for a mutation with no fields. Keep the session cookie (`credentials: 'same-origin'`). Login/logout refresh the session state; do not reuse a stale token after a session change.

Successful registration/event creation uses HTTP 201; normal reads/updates use 200. Malformed/non-object JSON uses 400, validation errors 422, missing/invalid organizer credentials 401, forbidden/CSRF operations 403, absent resources 404, domain conflicts 409, oversized bodies 413, wrong content types 415, throttled requests 429, and storage failures 503. Wrong pass ID/code combinations deliberately return the same `404 PASS_NOT_FOUND`; access to another organizer's event deliberately returns 404. Unknown API routes return a JSON 404 after request/session validation, including after the frontend is built. Private/authenticated responses use `Cache-Control: no-store`.

Dates in payloads are ISO 8601 timestamps with a timezone; use UTC `Z` when integrating directly. The UI presents Asia/Kolkata. API callers must not supply authoritative status, sequence, owner, queue position, or server-generated timestamps.

## Public events and registrations

| Method | Path | Access | Result |
| --- | --- | --- | --- |
| GET | `/session` | Public session | `{csrfToken, organizer, config:{campusName,logo}}` |
| GET | `/events` | Public | Array of visible event summaries/details with derived availability |
| GET | `/events/:slug` | Public | Event with live availability and `serverNow` |
| POST | `/events/:slug/registrations` | Anonymous session + CSRF | `{registration,event,managementCode}`; code is returned once |
| POST | `/passes/lookup` | Pass ID + management code + CSRF | `{registration,event}` |
| POST | `/passes/cancel` | Pass ID + management code + CSRF | Updated `{registration,event}` |

Solo registration example:

```json
{
  "teamName": "",
  "members": [{
    "name": "Asha Demo",
    "studentId": "DEMO-A001",
    "email": "asha.demo@example.com",
    "department": "Computer Science",
    "year": 2
  }],
  "consent": true
}
```

A team uses the same payload with a nonempty `teamName` and multiple member objects. The first member is the leader and must appear only once. Year, capacity and team limits must be JSON integers, not numeric strings. Year is 1–8, team limits are 1–20, and solo team limits are both 1. Server-side limits come from the event. Status is assigned atomically by the server (`CONFIRMED` or `WAITLISTED`), and `waitlistPosition` is populated only for a queued registration. Do not automatically retry a registration POST after an interrupted response; use organizer recovery.

Pass lookup and cancellation body:

```json
{"passId":"CF-REPLACE-WITH-REAL-ID","managementCode":"replace-with-private-code"}
```

Send both fields in the JSON body, never in a query string. Pass IDs alone confer no private access. Cancellation is before event start and cancels a whole team when applicable.

## Organizer authentication and dashboard

| Method | Path | Body / result |
| --- | --- | --- |
| POST | `/session/login` | `{email,password}`; sets authenticated session and returns updated session |
| POST | `/session/logout` | `{}`; invalidates authenticated session; returns `{loggedOut:true}` |
| GET | `/organizer/dashboard` | `{stats:{events,confirmed,waitlisted,participants,checkedIn},events}` |
| GET | `/organizer/events` | Array of the signed-in organizer's events |

Accounts are provisioned/reset by CLI, not public signup. Organizer sessions default to a 30-minute idle timeout. Every organizer endpoint enforces authentication and event ownership server-side.

## Event editing and lifecycle

| Method | Path | Body / result |
| --- | --- | --- |
| POST | `/organizer/events` | Editable event fields; creates draft event |
| PUT | `/organizer/events/:id` | Editable event fields; returns updated event |
| POST | `/organizer/events/:id/action` | `{action,reason?}`; returns updated event |

Editable fields:

```json
{
  "title":"CodeSprint",
  "slug":"codesprint",
  "category":"Technology",
  "description":"A fictional campus coding challenge.",
  "rules":"Bring a charged laptop. Work with your registered team.",
  "venue":"Innovation Lab",
  "image":"/images/code.jpg",
  "startAt":"2030-08-20T04:30:00Z",
  "endAt":"2030-08-20T10:30:00Z",
  "registrationOpensAt":"2030-08-01T04:30:00Z",
  "registrationDeadline":"2030-08-19T12:30:00Z",
  "mode":"TEAM",
  "capacity":12,
  "minTeamSize":2,
  "maxTeamSize":4,
  "contact":"tech-club@example.com"
}
```

The dates above illustrate payload format; use suitable current dates. Approved images are `/images/campus.jpg`, `/images/code.jpg`, `/images/stage.jpg`, and `/images/design.jpg`. Arbitrary remote URLs and file uploads are not supported.

Lifecycle actions are `publish`, `close`, `reopen`, `cancel`, and `archive`. Event cancellation requires a reason. Close/reopen controls only new registrations; eligible FIFO promotions can continue before the event starts. Mode/team-size/capacity restrictions are documented in [Business rules](BUSINESS_RULES.md).

Derived event fields include `confirmedCount`, `waitlistedCount`, `participantCount`, `checkedInCount`, `availableUnits`, `unit` (`seats` or `teams`), `phase`, `canRegister`, `availability` (`available`, `waitlist`, or `closed`), and `serverNow`.

## Roster, recovery, attendance, CSV

| Method | Path | Body / result |
| --- | --- | --- |
| GET | `/organizer/events/:id/registrations` | `{event,registrations}` |
| POST | `/organizer/registrations/:passId/cancel` | `{}`; cancels an eligible registration; returns `{registration,event}` |
| POST | `/organizer/registrations/:passId/rotate-code` | `{verified:true}` after in-person verification; `{managementCode}` |
| POST | `/organizer/registrations/:passId/attendance` | `{memberId,undo:false}` to check in; `undo:true` to undo; `{registration,event}` |
| GET | `/organizer/events/:id/export.csv` | CSV attachment; one row per participant from matching registrations |

Roster and export query fields are `search`, `status`, and `attendance`. Status accepts `CONFIRMED`, `WAITLISTED`, `CANCELLED`, or `all`/empty; attendance accepts `any`, `checked-in`, and `not-checked-in`. Search matches name, student ID, email, department, team and pass ID. Filters select registrations: a team matches an attendance filter when at least one member matches, and all its participant rows are exported together. With no filters, all registrations in the owned event are included, including cancelled history. The export excludes all secrets and unrelated organizer data and neutralizes spreadsheet formula prefixes.

A registration response includes `passId`, `eventId`, `teamName`, `status`, `sequence`, `leaderId`, `members`, `createdAt`, cancellation/promotion metadata, and current waitlist position. Each member has a stable `id` and `attendance: null | {at,organizerId}`. Management-code hashes are never returned. Public event endpoints include no participant rosters.

Attendance requires a published event whose start time has arrived and a confirmed registration. There is no end-time cut-off while it remains published; archiving or cancelling the event blocks new check-ins. Undo is explicit and audited and remains possible to correct an existing historical record; repeating a check-in cannot increase counts twice. Code rotation requires explicit verification and invalidates the old code.
