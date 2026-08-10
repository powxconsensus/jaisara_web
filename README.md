# Jaisara web

Next.js App Router front end for the prop-firm affiliate cashback and referral
platform — the marketing site, the member dashboard and the admin console.

## Getting started

```bash
pnpm install
cp .env.example .env.local     # point API_BASE_URL at your running API
pnpm dev
```

Opens on <http://localhost:3000>. The API must be running separately — see
`../api/README.md`.

> **pnpm only.** The lockfile is `pnpm-lock.yaml` and the version is pinned by
> the `packageManager` field, which both Corepack and the Docker build honour.
> An `npm install` here produces a second lockfile and a different dependency
> tree from the one that gets deployed.

## Environment

| Variable | Purpose |
| --- | --- |
| `API_BASE_URL` | Server-only origin of the NestJS API, including the `/api` prefix. |

There are no `NEXT_PUBLIC_*` variables and that is deliberate: the browser never
talks to the API directly. Every call goes through this app's own `/app/api/*`
route handlers, which attach the session cookie server-side — so no token and no
API origin is ever shipped into the client bundle.

`API_BASE_URL` is **runtime only** in production, and that is worth preserving.
Nothing in the production build reads it: the CSP falls back to `https:` for
images and `'self'` for connections, because the browser never calls the API
directly. So the API's address can change without rebuilding — point it at
`http://<api>.railway.internal:4000/api` and every page render stays on the
private network instead of crossing the public internet and being billed as
egress.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | dev server with hot reload |
| `pnpm build` | production build (`output: "standalone"`) |
| `pnpm start` | serve a completed build |
| `pnpm lint` | ESLint — run with `--max-warnings=0` in CI |
| `pnpm exec tsc --noEmit` | typecheck |

## Layout

```
app/
  (site)/          marketing pages, auth, dashboard — public shell
  (console)/       admin console — its own full-page shell, no marketing navbar
  api/             route handlers that proxy to the API and hold the cookies
  go/              outbound affiliate redirects
components/        UI, grouped by the surface that owns it
lib/               data fetching, formatting, types shared across surfaces
proxy.ts           redirects unauthenticated visitors away from /dashboard and /console
```

## Deploying

Railway, from a Dockerfile in this repo — see `../docs/10-railway-deployment.md`.
