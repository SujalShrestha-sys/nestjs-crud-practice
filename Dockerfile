# Stage 1: shared Node.js and pnpm setup
FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

# Stage 2: install every dependency needed to build the application
FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

# Stage 3: generate Prisma Client and compile NestJS
FROM dependencies AS build

COPY nest-cli.json prisma.config.ts tsconfig.build.json tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Prisma reads DATABASE_URL from prisma.config.ts while generating its client.
# This non-secret placeholder is used only at build time; the real URL is
# supplied to the running container through its environment.
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres" pnpm prisma:generate \
    && pnpm build

# Stage 4: use the build tools and migration files in a one-off migration job.
FROM build AS migration

# Stage 5: install only the dependencies needed at runtime
FROM base AS production-dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --prod --frozen-lockfile

# Stage 6: apply committed migrations, then run the compiled API as non-root.
# Prisma CLI is a production dependency because this image applies migrations at
# startup. This makes a newly created managed database ready before the API
# accepts requests.
FROM base AS production

ENV NODE_ENV="production"

WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node prisma.config.ts ./prisma.config.ts
COPY --chown=node:node docker/start-production.sh ./docker/start-production.sh

RUN chmod +x ./docker/start-production.sh

USER node

EXPOSE 3000

CMD ["./docker/start-production.sh"]
