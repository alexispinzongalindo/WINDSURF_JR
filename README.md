# islaAPP Site

This workspace contains the islaAPP multi-page site with onboarding, app builder, pricing, support, and project dashboard flows.

## Run After Reboot

```bash
cd /path/to/your/islaAPP/project
python3 dev_server.py
```

Then open:

- `http://127.0.0.1:4173/index.html`
- `http://127.0.0.1:4173/guide.html`
- `http://127.0.0.1:4173/app-builder.html`
- `http://127.0.0.1:4173/projects.html`
- `http://127.0.0.1:4173/services.html`
- `http://127.0.0.1:4173/ops.html`
- `http://127.0.0.1:4173/setup.html`

## Deploy To Render

This repo now includes `/render.yaml` for Blueprint deploys.

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Render, open Blueprint deploy:
   - `https://dashboard.render.com/blueprint/new`
3. Select your repo and apply the Blueprint.
4. Deploy (no required secrets for first launch).

Notes:

- The app writes JSON state into `/data` on disk. On Render free web services, filesystem is ephemeral (data can reset on restart/deploy).
- For persistent production data, migrate these JSON files to a real database.
- Add provider API keys later inside the app at `/setup.html` (after signing in on `/ops.html`).

## What Works

- App Builder saves draft state in browser storage.
- AI Guide page (`/guide.html`) gives one-page next-step guidance across onboarding, setup, services, and ops.
- App Builder generates brief and scaffolds starter projects into `projects/`.
- Scaffold output changes based on selected stack:
  - `HTML/CSS/JS`
  - `React + Supabase`
  - `Next.js + PostgreSQL`
  - `Node API + React Frontend`
- Projects dashboard lists generated scaffolds via `/api/projects`.
- Services marketplace loads external-provider catalog via `/api/providers`.
- Service requests are submitted and stored via `/api/service-request` and `/api/service-requests`.
- Live provisioning runs through `/api/provision-request` (requires provider keys below).
- Ops dashboard updates statuses through `/api/service-request-status` and can retry failed provisioning.
- Ops actions:
  - Status update: `POST /api/service-request-status`
  - Provision all: `POST /api/provision-request`
  - Retry failed only: `POST /api/provision-request` with `retryFailed=true`
- Session auth endpoints:
  - Auth config: `GET /api/auth-config`
  - Current session: `GET /api/auth-session`
  - Bootstrap first owner: `POST /api/auth-bootstrap`
  - Login: `POST /api/auth-login`
  - Logout: `POST /api/auth-logout`
  - List/create users (owner only): `GET/POST /api/auth-users`
- Provider setup endpoints:
  - Get masked saved settings (admin/owner): `GET /api/provider-config`
  - Save provider settings (admin/owner): `POST /api/provider-config`
  - Provider connection status: `GET /api/provider-health`
- Setup Wizard (`/setup.html`) now supports no-terminal provider setup.

## Live Provider Keys

Set these before starting the server for real provisioning:

- Render: `RENDER_API_KEY`, `RENDER_SERVICE_REPO`
- Dynadot: `DYNADOT_API_KEY`
- Supabase: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_ORG_ID`, `SUPABASE_DB_PASS`
- Neon: `NEON_API_KEY`
- OpenAI (optional for smarter App Builder planning): `OPENAI_API_KEY`

You can also set these from the in-app Setup Wizard (`/setup.html`) after signing in on Ops.

Optional:

- `DEFAULT_REGION`, `DEFAULT_DB_PASSWORD`
- `RENDER_SERVICE_BRANCH`, `RENDER_SERVICE_REGION`, `RENDER_BUILD_COMMAND`, `RENDER_START_COMMAND`
- `RENDER_OWNER_ID` (optional if auto-discovery works), `RENDER_OWNER_SLUG` or `RENDER_OWNER_NAME` to choose owner
- `SUPABASE_REGION`, `NEON_REGION_ID`, `NEON_PG_VERSION`, `NEON_ORG_ID`
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `DYNADOT_AUTO_REGISTER=true` to place real registration orders (default is availability-check only)
- `DYNADOT_REGISTRATION_YEARS=1` registration term when auto-register is enabled

## Ops Authentication

By default, use session login on `/ops.html`:

1. If this is the first run, bootstrap an owner account.
2. Sign in to receive a session token stored in browser local storage.
3. Owner users can create additional `admin` or `viewer` users.

Legacy fallback is still supported with `ADMIN_API_TOKEN`:

- If set, token auth can authorize protected ops endpoints.
- In the UI, save it in **Legacy Admin API Token (Optional)**.

Protected endpoints:

- `POST /api/provision-request` (requires `admin` or `owner`)
- `POST /api/service-request-status` (requires `admin` or `owner`)
