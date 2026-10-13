# End-to-end CampusFest demonstration

Use the setup commands in [README](../README.md), including a fresh **demo-only** storage directory and both servers, or a built frontend served from PHP. All names below are fictional. Do not use real student information in a course demonstration. Dates are relative to when `seed.php` runs, and screens display Asia/Kolkata (IST).

The required scenario uses **The Two-Seat Lab**, slug `two-seat-lab`, initially empty with exactly two solo seats, owned by `organizer@campusfest.test`. Do not use CodeSprint for this scenario; it starts full so it can independently demonstrate an existing queue.

## 1. Open the empty two-seat event

Visit `/events/two-seat-lab` and verify the page says two seats are available. Open registration. If it already has registrations, use a fresh private demo directory; do not erase a dataset you want to keep.

## 2. Register three students from the UI

Submit each registration separately, review the details, confirm permission/accuracy, and wait for the persisted result. Use the same department/year below for a compact demo.

| Student | Name | Student ID | Email | Department | Year |
| --- | --- | --- | --- | --- | --- |
| A | Asha Demo | `DEMO-A001` | `asha.demo@example.com` | Computer Science | 2 |
| B | Ben Demo | `DEMO-B002` | `ben.demo@example.com` | Computer Science | 2 |
| C | Charu Demo | `DEMO-C003` | `charu.demo@example.com` | Computer Science | 2 |

For each result, save its **actual server-assigned pass ID and management code** using the offered access-details control or a private note. Do not put management codes in shared screenshots, URLs or printed admission passes. Codes are only issued once unless the organizer rotates them.

## 3. Verify two confirmations and one waiting-list entry

A and B must be `CONFIRMED`. C must be `WAITLISTED`, position 1. Confirm the event page is full and offers “Join waiting list,” while new registrations remain eligible. Retrieve C at `/my-pass` with C's ID/code and inspect the waitlist warning. Its print view must say it is not a confirmed admission pass.

Optional FIFO extension: register D (`Dev Demo`, `DEMO-D004`, `dev.demo@example.com`, Computer Science, year 2). D should receive position 2. This makes it visible that the oldest queued entry is promoted, not a chosen person.

## 4. Retrieve A's pass and cancel it

At `/my-pass`, enter A's pass ID and private code. Inspect the confirmed registration, then select cancellation and explicitly confirm the dialog. The returned state must be cancelled. Attempting cancellation again must not free another seat or promote another queued entry.

## 5. Refresh C's private pass

Retrieve or manually refresh C's pass with C's original code. C must now be `CONFIRMED`; no organizer approval or queue selection is required. Confirmed occupancy remains two. If D was added, D remains waitlisted at position 1.

Print C's confirmed pass or open browser print preview. It must include event, venue, date/time, pass ID and participant name, with no management code or QR code.

## 6. Sign in and verify organizer state

Visit `/organizer/login` and use:

```text
organizer@campusfest.test
CampusFest!2026
```

Open The Two-Seat Lab roster. It should contain A cancelled, B confirmed, C confirmed, and optionally D waitlisted. The event has two confirmed registration units. Dashboard totals include other owned seeded events, so use the event row/roster to verify this scenario rather than expecting the overall dashboard to show only two.

Try search/status/attendance filters and a registration's detail view. Export while filtered later to see the same matching registrations in the file. For an ownership check, sign out and sign in as `arts@campusfest.test` / `ArtsFest!2026`: that organizer sees only their own events and cannot operate on the tech organizer's event IDs.

## 7. Demonstrate idempotent attendance

Sign back in as the tech organizer. Select **RoboRally**, slug `robo-rally`, the separately seeded ongoing event. It has already started and has confirmed participants. The Two-Seat Lab remains upcoming, so attendance is intentionally blocked there.

Copy an actual RoboRally pass ID from its roster, enter it in the attendance view and inspect the matched registration. Check in one participant. Observe the server timestamp and the checked-in participant count. Submit the same check-in again or reload and repeat it: the same participant still contributes exactly one to the count. If the UI disables an already checked-in button, the backend idempotence check is also covered by the integration/domain tests.

Use explicit undo once and verify the attendance count falls by one; recheck the member if desired. Undo and check-in actions are audited. Waitlisted/cancelled entries and draft/cancelled/archived events cannot receive new attendance. RoboRally's seeded entries are solo; participant-by-participant team attendance is additionally covered by the domain/HTTP tests with an isolated ongoing team event.

## 8. Export a participant CSV

Export the owned RoboRally roster. Open the downloaded `campusfest-participants.csv` in a text editor or spreadsheet. Confirm it contains event, pass ID, registration status, team, participant identity/contact, registration time, and attendance/time, with one row per member. The file contains no passwords or management codes/hashes.

With no filters, export includes all registrations in the event, including cancelled history. Search/status/attendance filters select registrations; a matching team exports all its member rows. Formula-like user input is neutralized in exported cells. CSV escaping/formula cases are verified by the backend tests rather than introducing real spreadsheet formulas during the live demo.

## 9. Restart the backend and prove persistence

Stop only the PHP server (`Ctrl+C` in its terminal), then start it with exactly the same command and `CAMPUSFEST_STORAGE`. Do not rerun seed. Refresh the roster and retrieve C's pass again. B/C should still be confirmed, A cancelled, and the attendance record should remain intact. A browser refresh alone is not evidence of persistence across a process restart.

## Additional short demonstrations

- **Team registration:** register a new two-member team for Design Jam; the leader appears once and the entry consumes one team unit. A duplicate member ID or email is rejected without exposing another participant.
- **Lost code:** find a registration in the owned roster, verify the student in person, confirm code replacement and save the new code. The old code must fail at My Pass; the new one must succeed.
- **Event management:** create a draft, edit its schedule, publish, close/reopen registrations, then cancel with a reason. Closing new registration does not freeze eligible pre-start FIFO promotions. Archive only ended/cancelled events.
- **Capacity edit:** increase a full event's capacity to promote its existing queue. Decreasing below occupancy must fail.
- **Responsive review:** inspect home, details, registration, My Pass, organizer dashboard and attendance around 360, 768 and 1440 CSS pixels. Use keyboard navigation, focus indicators, modal dismissal, and print preview.

This document is a reproducible demonstration script, not a claim that every check has been run. Actual outcomes belong in [Verification](VERIFICATION.md).
