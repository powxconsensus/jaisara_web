# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
#  Jaisara web — production image
#
#  `output: "standalone"` in next.config.ts is what makes the runtime stage
#  small: Next traces the modules each route actually imports and emits a
#  server that carries only those, so nothing here installs dependencies at
#  runtime.
#
#  `API_BASE_URL` is **runtime only**, and that is a property worth keeping.
#  Nothing in the production build reads it — the CSP falls back to `https:` for
#  images and `'self'` for connections, because the browser never calls the API
#  directly. So the address of the API can change without rebuilding: point it
#  at `http://<api>.railway.internal:4000/api` and every page render stays on
#  Railway's private network instead of going out and back over the public
#  internet, which is billed as egress.
# ─────────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=24-slim

# ── build ────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS build
WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# `packageManager` in package.json pins the pnpm version; corepack reads it, so
# the image resolves the same tree a laptop does.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# No `--mount=type=cache` here: Railway requires cache mount ids to be
# `s/<service-id>-<path>` and forbids environment variables inside them, so the
# id would have to be a hardcoded service id that means nothing on a laptop.
# Docker caches this layer until the lockfile changes anyway.
RUN pnpm install --frozen-lockfile

COPY . .

# Git does not track empty directories, so a fresh clone has no `public/` even
# though the working tree does. Create it rather than let the COPY below fail
# on a machine that cloned the repo instead of copying it.
RUN mkdir -p public && pnpm build

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

ENV NODE_ENV=production
# Next's standalone server reads both. `0.0.0.0` accepts the connections
# Railway's edge makes; the default would bind localhost only inside the
# container, where nothing can reach it.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Three separate copies because `next build` puts them in three places on
# purpose: the traced server, the immutable hashed assets, and anything served
# verbatim. The standalone server serves the latter two only if they are placed
# exactly here.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node

EXPOSE 3000

CMD ["node", "server.js"]
