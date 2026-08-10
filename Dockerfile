# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
#  Jaisara web — production image
#
#  `output: "standalone"` in next.config.ts is what makes the runtime stage
#  small: Next traces the modules each route actually imports and emits a
#  server that carries only those, so nothing here installs dependencies at
#  runtime.
#
#  `API_BASE_URL` is a **build argument as well as a runtime variable**, and
#  that is not redundant. next.config.ts derives the Content-Security-Policy
#  from its origin while the build runs, so an image built without it ships a
#  policy naming `localhost:4000` — the header is baked in, and setting the
#  variable at runtime does not change it.
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
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile

COPY . .

# Compiled into the CSP — see the header comment.
ARG API_BASE_URL
ENV API_BASE_URL=${API_BASE_URL}

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
