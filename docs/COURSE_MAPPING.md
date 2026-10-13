# Web Programming course mapping

Use this guide to explain an actual request through the project rather than presenting framework features in isolation.

| Course topic | Where to look | What to demonstrate |
| --- | --- | --- |
| HTML5 structure and semantics | `frontend/index.html`, `src/layouts/PublicLayout.jsx`, `src/components/UI.jsx`, `src/pages/Register.jsx` | Main content, navigation, headings, form labels, fieldsets/legends, semantic buttons and error feedback |
| CSS3 and responsive design | `frontend/src/styles/`, `src/layouts/`, `src/components/EventCard.jsx` | Warm/violet theme, image ratios, responsive grids, focus styles, mobile navigation, contained table scrolling and reduced-motion handling |
| Bootstrap | `frontend/src/main.jsx` and Bootstrap classes throughout pages/components | Grid columns/gutters, containers, buttons, alerts, form controls and responsive tables customized by project CSS |
| DOM events and forms | `src/pages/Register.jsx`, `MyPass.jsx`, `OrganizerLogin.jsx`, `components/UI.jsx` | Change/submit handlers, field feedback, pending states, review step, explicit confirmation and browser printing |
| JavaScript validation and data transformation | `src/utils/validation.js`, `src/utils/format.js` | Member checks, duplicate prevention feedback, datetime formatting and IST/UTC conversion; server repeats authoritative validation |
| React components and JSX | `src/components/EventCard.jsx`, `PassCard.jsx`, `UI.jsx`; `src/pages/` | Reusable card/pass/field primitives; data-driven rendering of members, events and states |
| React state and hooks | `src/pages/Register.jsx`, `src/hooks/useResource.js`, `src/hooks/Session.jsx` | `useState` form/review/result state, loading resources, context-backed sessions and effect cleanup |
| Client routing | `frontend/src/App.jsx`, `src/pages/Events.jsx`, `src/layouts/` | Public versus organizer routes, URL search parameters, deep links and 404 behavior |
| Fetch / asynchronous requests | `frontend/src/services/api.js` | Same-origin API requests, CSRF headers, structured API errors, pending UI and explicit retry behavior |
| Canvas API | `frontend/src/components/EventChart.jsx`, `src/pages/Dashboard.jsx` | Backend-driven confirmed/waitlisted bars, Canvas 2D drawing, pixel-ratio sizing, `ResizeObserver`, and an equivalent accessible table |
| PHP request handling | `backend/public/index.php`, `src/controllers/ApiController.php` | Method/path dispatch, JSON decoding, size/content-type checks, status codes and consistent JSON errors |
| PHP sessions | `backend/src/middleware/SessionAuth.php` | Login/logout, HttpOnly/SameSite/Secure cookies, regenerated IDs, CSRF and idle expiry |
| PHP functions/classes and validation | `backend/src/services/CampusService.php`, `src/validators/Input.php` | Ownership, typed input, normalized duplicate checks, exact schedule boundaries and server-assigned status |
| PHP file handling | `backend/src/storage/JsonStore.php` | Stable lock file, shared/exclusive `flock`, checked JSON decoding/encoding, temporary files, `fflush`/`fsync`, atomic replacement and failure handling |
| Algorithms and consistency | `backend/src/services/CampusService.php` | Registration-unit capacity, monotonic sequence allocation, FIFO ordering and atomic cancellation/promotion |
| CSV / downloads | `CampusService::exportCsv`, API export route, frontend roster export control | One row per participant, CSV escaping, formula neutralization, browser download and ownership checks |
| CLI scripts | `backend/scripts/setup.php`, `seed.php`, `organizer.php` | Explicit initialization, relative-date synthetic seed, safe demo reset, hashed passwords and CLI password reset |
| Testing | `backend/tests/`, `frontend/src/__tests__/`, `frontend/src/tests/setup.js` | Isolated test storage, injected clock, domain/API checks, multiple PHP processes and focused React/form utility tests |

Paths beginning `src/` in the frontend rows are relative to `frontend/`. Paths beginning `src/` in the PHP rows are relative to `backend/`.

## Suggested viva walkthrough

1. Open `/events/two-seat-lab`. Trace `useResource` → Fetch wrapper → API controller → `CampusService` → shared-lock state read.
2. Submit a solo registration. Explain frontend validation as immediate feedback, and locked server validation as authoritative. Identify where the server creates the pass ID, secret hash and sequence.
3. Fill two seats and waitlist a third. Cancel the first. Show how both cancellation and FIFO promotion are committed together and how My Pass gets the new status from PHP.
4. Log in as an organizer. Explain the distinction between an anonymous CSRF session, a private student management code and an organizer account.
5. Check in a participant in the ongoing event. Show idempotence, participant-level attendance and an audited undo.
6. Inspect the Canvas chart and its accessible table, then export a filtered CSV. Explain why team capacity and member headcount are different statistics.
7. Restart PHP and retrieve the same records. Explain why browser-only state, a hardcoded success message, or a static host would not satisfy persistence.

## Design choices and constraints

React organizes UI state and reusable components; Bootstrap supplies foundational responsive layout; project CSS creates the visual identity. Plain PHP implements authorization and all business rules. JSON file handling makes persistence visible and explainable for the course, with real locking and atomic writes. This deliberate small-project architecture has a single-instance/local-filesystem boundary, described in [Architecture](ARCHITECTURE.md).

No student accounts, database, external API keys, QR system, payments, notifications or institution endorsement are implied. Course marks should be supported by the implemented source and [recorded verification](VERIFICATION.md), not by this mapping alone.
