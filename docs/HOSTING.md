# Full application hosting

CampusFest requires a PHP-capable host. GitHub Pages cannot execute its PHP API. Host the built frontend and PHP API on the same HTTPS origin so session cookies, CSRF and private-pass requests continue to work without cross-origin changes.

## Host requirements

- PHP 8.2 or newer with standard JSON, sessions, filters and filesystem functions.
- Apache 2.4 with `mod_rewrite`, or an equivalent server configured for the same routing rules.
- A configurable document root pointing only at `backend/public`.
- Persistent local disk accessible to one application instance, with working `flock` and atomic file replacement.
- A private storage directory outside the public root that survives app updates and restarts.
- A terminal or one-off CLI facility to initialize storage and create the organizer account.
- HTTPS configured so PHP receives `HTTPS=on` and emits Secure session cookies. If TLS ends at a proxy, configure this at the trusted server boundary. Do not blindly trust arbitrary client forwarding headers.

Do not use an ephemeral filesystem for state. Multiple replicas and network-mounted storage are unsupported. A free hosting tier must meet the persistence and CLI requirements before it can run this version safely.

## Prepared Render deployment

`render.yaml` defines one PHP/Apache Docker service in Singapore and a 1 GB persistent disk at `/var/data`. Current documented pricing checked on 27 October 2026 is approximately US$7/month for `0.5c-512mb` compute plus US$0.25/month for 1 GB disk, before taxes, workspace charges if applicable, or usage overages. Review the actual Render checkout before approving paid resources. No Render service is created merely by committing these files.

After cost approval, import this repository as a Render Blueprint. Enter your organizer email when prompted. Render generates a private organizer password in the service environment. The first-deploy hook initializes an empty dataset with that organizer account. Read/save the password privately in Render and sign in at `/organizer/login`. The service does not contain the local demo credentials or seeded events. Create events in the organizer workspace.

The initialization hook runs explicitly after the first successful deploy, where the disk is available. It preserves any existing valid state and never resets passwords. Normal startup only prepares directory permissions and starts Apache. If the hook fails, correct the environment settings and run `su -s /bin/sh www-data -c 'php /var/www/html/deploy/render-init.php'` in the service shell. Do not use a pre-deploy command for this because Render does not mount the disk there.

Automatic deployments are disabled in the Blueprint. Releases use manual deploys, preserving the disk. The health check at `/` verifies the web server and built UI; separately verify `/api/session` after initialization. Disk-backed service deploys can briefly interrupt availability.

The supplied Apache configuration marks the connection as HTTPS for secure cookies because this container targets Render's HTTPS public ingress. Do not expose its port directly on an HTTP-only public host. All application requests use the same origin. Runtime data, `.env`, presentations and local tools are excluded from the Docker build context. The Docker build removes the demo seed definitions.

References: [Render Docker support](https://render.com/docs/docker), [Blueprint specification](https://render.com/docs/blueprint-spec), [persistent disks](https://render.com/docs/disks), and [pricing](https://render.com/pricing).

## Prepare the release on Windows

From the repository root, run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package-hosting.ps1
```

This builds the frontend and creates a timestamped ZIP under `output/`. The ZIP contains compiled frontend files, PHP application code and the setup/account CLI. It excludes existing state, session files, logs, tests, tooling, the demo seed command and the demo credential definitions. It does not upload or publish anything.

## Install on the selected host

1. Extract the package into a private application directory, for example `/srv/campusfest/app`.
2. Set the domain's document root to `/srv/campusfest/app/backend/public`. Never point the document root at the package root or `backend`.
3. Enable the supplied `.htaccess` rewrite rules, or translate them into the host's server configuration. Permit only the required override directives. Serve the app at the domain root, not an unconfigured URL subdirectory.
4. Set `CAMPUSFEST_STORAGE` to a persistent private path such as `/srv/campusfest/data` in both the web PHP environment and the setup CLI environment. Grant the web PHP user access without making the directory world-writable.
5. Initialize empty storage once. Provision your own organizer account before making the application available to visitors.

Example setup in a Bash terminal on the host:

```bash
export CAMPUSFEST_STORAGE=/srv/campusfest/data
php backend/scripts/setup.php
read -r -p 'Organizer email: ' organizer_email
read -r -p 'Organizer name: ' organizer_name
read -r -s -p 'Organizer password (12–72 bytes): ' CAMPUSFEST_ORGANIZER_PASSWORD
printf '\n'
export CAMPUSFEST_ORGANIZER_PASSWORD
php backend/scripts/organizer.php create --email="$organizer_email" --name="$organizer_name"
unset CAMPUSFEST_ORGANIZER_PASSWORD
```

Run setup as the PHP filesystem owner, or set ownership afterward so both CLI and web PHP can use the private files. Initialization refuses to overwrite an existing dataset. Setting environment variables in the CLI does not automatically configure Apache/PHP-FPM; apply them in the host's PHP configuration too.

The initial account creates and publishes real events through `/organizer/events/new`. Do not publish the local demo credentials. Never rerun initialization during normal restarts or releases.

## Verify before handoff

- Check `/api/session` returns JSON, a CSRF token and an HttpOnly, Secure, SameSite=Lax session cookie over HTTPS.
- Open the homepage and refresh `/events` directly. Check image and asset requests.
- Sign in and create a small test event. Complete registration, private pass retrieval, cancellation and roster inspection.
- Confirm an unauthenticated visitor cannot read organizer rosters or download CSV.
- Confirm direct requests to `/storage/state.json`, `/src/bootstrap.php` and `/backend/storage/state.json` cannot expose files.
- Restart the service and confirm its records persist. Check export and attendance with an eligible event.
- Verify backups and restoration with the hosting provider. Stop writes or follow the same stable lock protocol when copying state. Keep backups private.

Host-specific deployment and HTTPS checks must run after the provider and domain are selected. Preparing this package alone is not a live deployment.
