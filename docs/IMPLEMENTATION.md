# Implementation checklist

- [x] Atomic PHP JSON storage, stable locking, capacity accounting and FIFO queue transactions
- [x] Secure sessions, CSRF, bounded throttling, ownership, documented API and explicit CLI setup
- [x] Public React discovery, solo/team registration, private passes, cancellation and automatic promotion
- [x] Organizer event management, rosters, member attendance, CSV exports and Canvas dashboard
- [x] Local attributed photographs, responsive layouts, keyboard controls and print stylesheet
- [x] Backend/frontend tests, independent-process concurrency, production build and live browser walkthrough
- [x] Setup, architecture, API, business rules, course mapping, demonstration and verification documentation

Implementation and automated verification are complete. See [VERIFICATION.md](VERIFICATION.md) for actual command outcomes, browser evidence and the remaining native print/download and platform checks. The app uses real PHP endpoints and filesystem persistence; test suites use isolated storage.

## Project map

| Area | Location |
| --- | --- |
| React routes, forms and organizer pages | `frontend/src/pages`, `frontend/src/App.jsx` |
| Shared UI, passes, dialogs and Canvas | `frontend/src/components` |
| API requests, session context and loading state | `frontend/src/services`, `frontend/src/hooks` |
| App and print styles | `frontend/src/styles` |
| Local photographs | `frontend/public/images` |
| PHP API and security middleware | `backend/src/controllers`, `backend/src/middleware` |
| Domain rules and input validation | `backend/src/services`, `backend/src/validators` |
| Atomic private storage | `backend/src/storage/JsonStore.php` |
| Public entry point and SPA router | `backend/public` |
| Setup, demo and organizer CLI | `backend/scripts` |
| Automated verification | `backend/tests`, `frontend/src/__tests__` |

Demo data was explicitly initialized; startup never reseeds. Browser QA used separate ignored `.runtime/browser-demo` storage on port 8765. Existing default seed data was preserved. The README starts a new demo outside the synced checkout and documents both production and Vite development commands. No public deployment was performed.
