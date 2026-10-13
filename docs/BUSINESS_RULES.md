# CampusFest business rules

## Capacity and identity

- An event is either `SOLO` or `TEAM`. Solo capacity counts registrations (seats); team capacity counts entire teams. A team of four consumes one team unit.
- Only `CONFIRMED` registrations consume capacity. `WAITLISTED` and `CANCELLED` entries consume none. Participant headcount is a separate statistic.
- The leader is the first team member, appears once, and counts toward team size. Every member supplies name, student ID, email, department, and year.
- Student IDs are compared case-insensitively with whitespace removed; email addresses are compared case-insensitively with surrounding whitespace removed. Display values are retained. A duplicate ID **or** email within a submitted team or any active registration in the same event is rejected with a generic conflict. Active means confirmed or waitlisted.
- Cancelled participants may register again. The new registration gets a new pass ID and a new sequence, with no restored queue priority.
- Student IDs and emails are self-entered, unverified identifiers. CampusFest does not establish institutional identity.

## Registration and FIFO promotion

The server accepts registrations only for a published event with new registrations enabled, at or after registration opening and strictly before the deadline. Schedules must satisfy:

```text
registration opens < registration deadline <= event start < event end
```

The server assigns every registration a monotonically increasing sequence while holding the transaction lock. FIFO uses this sequence, not timestamps or array order. The server fills available units with eligible queued registrations before admitting a newcomer. If no unit remains, the newcomer joins the waiting list.

Cancelling a confirmed entry before event start and increasing capacity fill available units from the oldest eligible waiting-list entries in the same transaction. Capacity cannot fall below confirmed occupancy. A waitlisted cancellation changes queue positions but does not free a confirmed unit. Repeated cancellation is harmless and cannot promote another entry.

Existing queued entries remain eligible for promotion **after the new-registration deadline or when new registrations are closed**, provided the event is still published and has not started. No promotion occurs at or after event start. There are no manual queue-jumping controls or partial team admissions.

## Cancellation and event lifecycle

Students need both their public pass ID and private management code to retrieve or cancel their registration. Self-service cancellation is available only before event start. Cancelling a team cancels the entire team. The UI asks for explicit confirmation.

Organizers can cancel only their own event's registrations, before event start and while the entry has no attendance records. Registration and attendance history is preserved. Event cancellation changes all active registrations to cancelled in one transaction, records a reason, preserves existing attendance, and triggers no promotions.

Events move through draft, published, cancelled, and archived lifecycle states. Upcoming, ongoing, and completed are computed from timestamps and are separate from lifecycle state. An event may be archived only after it has ended or been cancelled. Events with registration history are not hard deleted.

Once registrations exist, solo/team mode cannot change, and edited team-size limits must remain compatible with existing entries. Every update is checked again by the server under the transaction lock; a stale page never overrides current capacity or deadline rules.

## Passes and recovery

A management code contains at least 32 cryptographically random bytes. Only its hash is stored. Its plaintext is returned only on first issuance or explicit rotation. Students should save it separately from their printable pass; it is excluded from pass printing and URLs and is not saved in localStorage. No email recovery exists.

After an organizer explicitly confirms in-person verification, they may issue a replacement management code. Rotation invalidates the old code and adds an audit entry. This also recovers access if the server saved a registration but the original response was interrupted. A registration POST is never silently retried.

A waitlisted printout prominently identifies itself as **not a confirmed admission pass**. A cancelled event or registration cannot be used for admission.

## Attendance and exports

Attendance opens at event start for published events. It remains available after end time until the event is cancelled or archived. Only confirmed registrations can check in. An organizer must own the selected event and must inspect a matched registration before changing attendance. Each participant, including each team member, has an independent attendance record with server timestamp and organizer ID. A repeated check-in is idempotent. Explicit undo removes the participant's attendance record and is audited; it may correct an existing record after event cancellation or archival.

CSV export uses the same registration search/status/attendance filters as the roster. It includes one row per participant from each matching registration, including all members of a matching team. Registration status and attendance are separate columns. Fields are escaped with PHP's CSV writer and potentially executable spreadsheet cells are neutralized. Passwords, management codes or hashes, sessions, and other organizers' data are never exported.

## Time and trust

Timestamps are stored in UTC and displayed in `Asia/Kolkata` (IST, UTC+05:30). Event editor local date/time inputs represent that same timezone. Registration deadlines use the server clock, not the browser clock. Tests inject a deterministic clock.

The server does not trust submitted status, waitlist position, sequence, ownership, timestamp, or occupancy. All business mutations validate current state while holding the same exclusive lock through the commit.
