# CampusFest

**Discover. Register. Show up.**

A Web Programming course project: a React + Bootstrap event portal backed by plain PHP and persistent JSON files. Students discover events, register solo or as a team, retrieve private passes, and cancel before the event starts. Organizers sign in to manage owned events, inspect FIFO waiting lists, recover pass access after verification, record participant attendance, and export CSV.

Sample campus names, people and events are fictional demo content. This is not an endorsed institutional service. Student IDs/emails are self-entered and are not verified identities.

## Prerequisites

- PHP 8.2 or later with its standard JSON, session, filter and filesystem functions. No Composer packages or database are required.
- Node.js 22.12 or later and npm for the Vite frontend. Node does not run the backend.
- A local filesystem writable by PHP and a current browser.

The implementation environment has **PHP 8.4.26, Node.js 22.17.1, and npm 11.12.0 on Windows**. Frontend dependencies are pinned and locked: React 19.1.1, React Router 7.18.4, Bootstrap 5.3.8, Vite 7.3.7, Vitest 4.1.11 and ESLint 9.36.0. Actual command results and browser checks are recorded separately in [Verification](docs/VERIFICATION.md); macOS/Linux and Apache instructions are provided but are not claimed as tested unless listed there.

PHP must be available as `php` on PATH. In the implementation workspace only, a downloaded, ignored PHP runtime is available at `.tools/php/php.exe`; this is not a committed project dependency. On that Windows checkout you can replace `php` with `& .\.tools\php\php.exe` in PowerShell. Fresh clones need their own PHP installation. XAMPP users may use `C:\xampp\php\php.exe` or add its directory to PATH. Check versions first:

```sh
php --version
node --version
npm --version
```

## Quick start in this existing Windows checkout

The ignored PHP runtime and installed frontend dependencies are available in this implementation checkout. From `C:\Users\SUBASH\OneDrive\Documents\GitHub\CampusFest`, select private local storage and initialize it **once**:

```powershell
$env:CAMPUSFEST_STORAGE = Join-Path $env:LOCALAPPDATA 'CampusFest/demo'
& .\.tools\php\php.exe backend/scripts/seed.php
```

If setup reports that storage already exists, keep that state and continue. Skip the seed command on later starts, but set `CAMPUSFEST_STORAGE` in every new PHP terminal. Start the complete built application with:

```powershell
$env:CAMPUSFEST_STORAGE = Join-Path $env:LOCALAPPDATA 'CampusFest/demo'
npm --prefix frontend run build
& .\.tools\php\php.exe -S 127.0.0.1:8765 -t backend/public backend/public/router.php
```

Then open **http://127.0.0.1:8765** and use the [demo organizer accounts](#disposable-demo-organizer-accounts). Keep this terminal open. These commands start the server; no currently running server is assumed. Port 8765 is used here because port 8000 was occupied by an unrelated application during implementation. If 8765 is also occupied, choose another free port without stopping unrelated processes.

For Vite development against this PHP server, open a second PowerShell terminal in the repository and run:

```powershell
$env:CAMPUSFEST_API_TARGET = 'http://127.0.0.1:8765'
npm --prefix frontend run dev
```

Open the Vite URL printed in the terminal (normally **http://127.0.0.1:5173**). The `CAMPUSFEST_STORAGE` variable belongs in the PHP terminal; `CAMPUSFEST_API_TARGET` belongs in the Vite terminal. A new clone should follow the clean installation below because `.tools` and `node_modules` are not committed.

## Clean local demo

Run all commands from the repository root. Install frontend dependencies:

```sh
npm --prefix frontend ci
```

Set a private, **nonsynchronized local storage directory** before setup and before every PHP server/CLI command. This matters when the repository itself is inside OneDrive. Use the same directory in every terminal; the frontend does not need this variable.

Windows PowerShell:

```powershell
$env:CAMPUSFEST_STORAGE = Join-Path $env:LOCALAPPDATA 'CampusFest/demo'
php backend/scripts/seed.php
php -S 127.0.0.1:8000 -t backend/public backend/public/router.php
```

macOS/Linux:

```sh
export CAMPUSFEST_STORAGE="$HOME/.local/share/campusfest/demo"
php backend/scripts/seed.php
php -S 127.0.0.1:8000 -t backend/public backend/public/router.php
```

In a second terminal, from the repository root:

```sh
npm --prefix frontend run dev
```

Open the Vite URL printed in the terminal, normally **http://127.0.0.1:5173**. Vite proxies `/api` to PHP on port 8000 by default and forwards session cookies. If PHP uses another port, set `CAMPUSFEST_API_TARGET` in the Vite terminal before starting it. Keep the same hostname; do not alternate `localhost` and `127.0.0.1` within a session.

The explicit seed command creates relative-to-now schedules, including an ongoing attendance event, a full event with a FIFO queue, solo/team events, a closed event, a draft, a past event, and an empty two-seat demonstration event. It refuses to overwrite existing state. Restarting PHP never reseeds it. If `CAMPUSFEST_STORAGE` is unset, the default is `backend/storage`; do not use that default for active storage in a synced checkout.

### Disposable demo organizer accounts

Visit `/organizer/login` on the application URL after running the seed command: **http://127.0.0.1:8765/organizer/login** for the existing-checkout quick start, or **http://127.0.0.1:5173/organizer/login** with Vite's default port.

| Email | Password | Owned demo events |
| --- | --- | --- |
| `organizer@campusfest.test` | `CampusFest!2026` | The Two-Seat Lab, CodeSprint, Design Jam, RoboRally, LensCraft |
| `arts@campusfest.test` | `ArtsFest!2026` | Open Mic, Debate Arena, Campus Makers Showcase |

These local-only credentials are deliberately disposable and are not displayed in the public frontend. Students have no accounts: save the pass ID **and** the private management code shown after registration. No email is sent.

For a deliberate reset of an existing **demo** dataset, stop the server first and target the selected storage explicitly:

```powershell
php backend/scripts/seed.php --storage="$env:CAMPUSFEST_STORAGE" --reset-demo
```

```sh
php backend/scripts/seed.php --storage="$CAMPUSFEST_STORAGE" --reset-demo
```

Do not use demo reset on data you want to retain. The reset flag is not part of normal startup; it refuses any state not explicitly marked as demo data.

## Build and run as one PHP application

```sh
npm --prefix frontend run build
php -S 127.0.0.1:8000 -t backend/public backend/public/router.php
```

Set the same `CAMPUSFEST_STORAGE` as above in this terminal. Open **http://127.0.0.1:8000**. The build copies compiled HTML/assets/images to `backend/public` while preserving `index.php` and `router.php`. Deep links such as `/events/two-seat-lab` can be refreshed. Unknown `/api/...` paths remain JSON 404s. Build output and runtime data are ignored by Git.

Do not use Vite's static preview or a static-only host as the complete application: the backend still needs PHP. After dependencies have been installed and the included local images are present, the core demo works without external API keys or internet access.

## Configuration and organizer maintenance

| Variable | Default | Purpose |
| --- | --- | --- |
| `CAMPUSFEST_STORAGE` | `backend/storage` | Private canonical state, stable lock, sessions and sanitized logs |
| `CAMPUSFEST_CAMPUS_NAME` | `The campus collective` | Configurable campus label, not an endorsement |
| `CAMPUSFEST_LOGO` | Empty | Optional existing local `/images/filename` asset |
| `CAMPUSFEST_SESSION_IDLE_SECONDS` | `1800` | Organizer session idle timeout in seconds |
| `CAMPUSFEST_ORGANIZER_PASSWORD` | Unset | Password input for organizer CLI, preferred over command-line plaintext |
| `CAMPUSFEST_API_TARGET` | `http://127.0.0.1:8000` | Vite development proxy target; set in the Node/Vite terminal, not needed for the built PHP application |

Set PHP variables before starting PHP and the development proxy variable before starting Vite; these configuration variables are read from the process environment. A project `.env` file is not automatically loaded for them. To use a logo, add an authorized asset under `frontend/public/images`, set `CAMPUSFEST_LOGO` to its local path, and rebuild. No external API key is needed.

For an alternate PHP port on macOS/Linux, start PHP with `php -S 127.0.0.1:8765 -t backend/public backend/public/router.php`; in the Vite terminal use `export CAMPUSFEST_API_TARGET='http://127.0.0.1:8765'` before `npm --prefix frontend run dev`. Changing this proxy target does not change browser API paths or the production build.

For a clean, non-demo private dataset, choose a **different** storage directory and initialize it explicitly:

```sh
php backend/scripts/setup.php
```

Provision an organizer with your own 12–72 byte password. The environment-variable method avoids putting it in process arguments. Example PowerShell (replace the placeholder with a strong unique password):

```powershell
$env:CAMPUSFEST_ORGANIZER_PASSWORD = 'replace-with-your-own-password'
php backend/scripts/organizer.php create --email='organizer@example.com' --name='Campus organizer'
Remove-Item Env:CAMPUSFEST_ORGANIZER_PASSWORD
```

macOS/Linux:

```sh
printf 'Organizer password: '
read -r -s CAMPUSFEST_ORGANIZER_PASSWORD
export CAMPUSFEST_ORGANIZER_PASSWORD
php backend/scripts/organizer.php create --email='organizer@example.com' --name='Campus organizer'
unset CAMPUSFEST_ORGANIZER_PASSWORD
```

For password reset, set the variable again and replace `create` with `reset-password` (the name is unnecessary). Existing sessions are invalidated after password reset. CLI commands also accept `--storage=PATH` and `--password=VALUE`; avoid the latter for real secrets because shell history/process listings may expose it. Public signup is intentionally absent.

## Routes and demonstration

| Route | Use |
| --- | --- |
| `/` | Homepage with real backend event counts |
| `/events` | URL-preserved search, category/type, period and sorting |
| `/events/two-seat-lab` | Empty two-seat demo event |
| `/events/:slug/register` | Solo/team form, review and persisted result |
| `/my-pass` | Private pass retrieval, refresh, print and cancellation |
| `/organizer/login` | Organizer authentication |
| `/organizer` | Owned-event statistics and accessible Canvas chart |
| `/organizer/events` | Create, edit, publish, close, cancel and archive owned events |
| `/organizer/events/:id/participants` | Roster, queue, access recovery and CSV export |
| `/organizer/attendance` | Select an owned event and inspect a pass before check-in |

Follow [the exact demonstration](docs/DEMO.md): register A/B/C for two seats, cancel A, observe C's automatic confirmation, inspect the organizer roster, check in a participant in the separately seeded ongoing event, export CSV, and restart PHP to prove persistence. Save student management codes separately from printed passes.

## Tests

The backend test scripts create their own temporary storage. They must never run against your active demo state.

```sh
npm --prefix frontend run build
php backend/tests/domain.php
php backend/tests/concurrency.php
node backend/tests/http.mjs
npm --prefix frontend test
npm --prefix frontend run lint
```

Build before the HTTP suite: one integration check refreshes a production SPA deep link and therefore requires `backend/public/index.html`.

PHP syntax checks, PowerShell:

```powershell
Get-ChildItem backend -Filter *.php -Recurse | ForEach-Object { php -l $_.FullName }
```

PHP syntax checks, macOS/Linux:

```sh
find backend -name '*.php' -print0 | xargs -0 -n1 php -l
```

The HTTP integration script uses `php` on PATH or the `PHP_BINARY` environment variable. With the workspace-local Windows runtime, set `$env:PHP_BINARY = (Resolve-Path '.tools/php/php.exe').Path` before `node backend/tests/http.mjs`. It starts its own isolated PHP server; it does not need the demo server. See [Verification](docs/VERIFICATION.md) for test outcomes, concurrency evidence and any unrun checks. Simultaneous PHP processes test storage locking independently of the single-worker development server. Passing a build alone is not end-to-end evidence.

## Optional XAMPP / Apache

Build the frontend first. Enable PHP and `mod_rewrite`. Configure a dedicated local virtual host whose document root is **only `backend/public`**, never the repository or `backend` directory. Example Windows configuration; replace the paths and set a private writable storage directory:

```apache
<VirtualHost *:80>
    ServerName campusfest.local
    DocumentRoot "C:/path/to/CampusFest/backend/public"
    SetEnv CAMPUSFEST_STORAGE "C:/private/campusfest/demo"
    <Directory "C:/path/to/CampusFest/backend/public">
        Require all granted
        AllowOverride None
        Options -Indexes
        DirectoryIndex index.php
        RewriteEngine On
        RewriteRule ^api(?:/.*)?$ index.php [END,QSA]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ index.php [END,QSA]
    </Directory>
</VirtualHost>
```

Use forward slashes in Apache paths. On macOS/Linux, substitute absolute Unix paths and grant the web-server account access to the private storage directory. Add `127.0.0.1 campusfest.local` to your local hosts file, initialize/seed **that same private storage path** from the CLI, restart Apache, and open `http://campusfest.local`. Hosts/config editing may require local administrator privileges. Keep this local demo private; no public deployment is performed. HTTPS hosting later must make PHP aware of HTTPS so session cookies are Secure.

## Troubleshooting and limits

- **`php` not found:** install PHP/add it to PATH, or use the full executable path noted above. PHP's development server is for local demonstration.
- **Port already in use / wrong API responds:** choose a free PHP port and set `CAMPUSFEST_API_TARGET` to that exact origin in the Vite terminal. Restart Vite after changing it. Do not stop an unrelated application just to reclaim port 8000.
- **Setup required / missing or corrupt state:** check `CAMPUSFEST_STORAGE` in the PHP terminal. Initialize a new dataset only intentionally. For corruption, stop PHP and restore a known valid backup; startup will not silently erase data.
- **Write or lock failure:** the directory must be writable by the PHP user and on a local filesystem. Move runtime storage out of OneDrive/network shares. Failed commits retain the previous state and report an error.
- **Login/CSRF errors:** enable cookies, use one hostname, and refresh to obtain a new session token. Sessions expire after 30 idle minutes by default.
- **429 / too many attempts:** wait ten minutes. Local users sharing an IP also share its action-specific rate limit.
- **Lost management code or interrupted response:** ask the owning organizer to find the entry and explicitly issue a new code after in-person verification. No email recovery or secret lookup exists.
- **Event no longer eligible:** seed dates are relative to seed time. Use a separate fresh demo dataset if the old events have passed; never silently reset existing history.
- **API works but PHP homepage reports not built:** run `npm --prefix frontend run build` or use the Vite URL during development.

The JSON store is for one application instance on a local filesystem, with serialized writes and whole-file reads. It is not a distributed or high-scale database. Identity verification, email/SMS, payments, student accounts, QR scanning, certificates and public deployment are outside scope. See [Architecture](docs/ARCHITECTURE.md) for storage/OS limits and [Verification](docs/VERIFICATION.md) for concrete environment limits.

Further documentation: [Business rules](docs/BUSINESS_RULES.md), [API](docs/API.md), [course mapping](docs/COURSE_MAPPING.md), and [photograph attribution](docs/ASSETS.md).
