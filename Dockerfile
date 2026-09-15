# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# base - shared foundation for every stage: Node plus a pinned pnpm
# -----------------------------------------------------------------------------
FROM node:26-alpine AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"
# Corepack is no longer bundled with the Node distribution, install pnpm directly.
# Version must match "packageManager" in the root package.json: pnpm 10+ manages its
# own version and would otherwise try to download the pinned build at runtime, which
# fails on alpine (the self-managed artifact is linked against glibc, not musl).
RUN npm install --global pnpm@12.4.1
WORKDIR /usr/src/app

# -----------------------------------------------------------------------------
# deps - manifests and install only. Kept separate so the install layer stays
# cached until package.json or the lockfile actually change.
# -----------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter server...

# -----------------------------------------------------------------------------
# development - full dependency tree, runs the watcher
# -----------------------------------------------------------------------------
FROM deps AS development
COPY apps/tsconfig.base.json ./apps/
COPY apps/server ./apps/server
EXPOSE 3000
CMD ["pnpm", "--filter", "server", "dev"]

# -----------------------------------------------------------------------------
# build - compile TypeScript, then collect a self-contained deployable directory
# -----------------------------------------------------------------------------
FROM deps AS build
COPY apps/tsconfig.base.json ./apps/
COPY apps/server ./apps/server
RUN pnpm --filter server build
# deploy resolves the workspace symlinks into a plain node_modules tree
# and keeps production dependencies only
RUN pnpm --filter server deploy --prod --legacy /prod/server

# -----------------------------------------------------------------------------
# production - final image: no pnpm store, no sources, no devDependencies
# -----------------------------------------------------------------------------
FROM node:26-alpine AS production
ENV NODE_ENV=production
WORKDIR /usr/src/app
# Copy explicitly: `pnpm deploy` also carries sources, tsconfigs and test setup,
# none of which a runtime image has any use for
COPY --from=build --chown=node:node /prod/server/node_modules ./node_modules
COPY --from=build --chown=node:node /prod/server/dist ./dist
COPY --from=build --chown=node:node /prod/server/package.json ./package.json
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
