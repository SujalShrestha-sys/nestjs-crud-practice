# Docker and CI CD Learning Plan

**Project:** NestJS CRUD Practice API
**Goal:** Learn how to package, test, publish, and later deploy a NestJS application in small, understandable steps.
**Status:** In progress

## How to use this plan

Complete one phase at a time. Do not move to the next phase until you understand the current phase and its completion checks pass.

Each phase contains:

- **Why it matters** so the work has context.
- **Concepts to learn** before writing files.
- **Implementation work** that will be completed in the repository.
- **Commands to practise** so the result can be verified manually.
- **Done when** checks that define completion.

## Target architecture

```text
Developer computer
    |
    | docker compose up
    v
NestJS API container <------> PostgreSQL container
    |
    | push to GitHub
    v
GitHub Actions
    |
    | lint, test, build, Docker image build
    v
Docker Hub
    |
    | later deployment workflow
    v
Chosen hosting platform
```

## Phase 0, Understand the current application

### Why it matters

Docker and CI CD do not replace application configuration. They package and run the application consistently. Before containerizing anything, understand what the application needs at runtime.

### Concepts to learn

- Environment variables
- Build time versus runtime
- Application dependencies
- Database migrations
- Secrets and why they must not be committed

### Current runtime requirements

The NestJS application currently needs these values:

```text
DATABASE_URL
BETTER_AUTH_URL
BETTER_AUTH_SECRET
ARCJET_KEY
ARCJET_MODE
ARCJET_ENV
PORT
```

### Implementation work

1. Review `.env` and confirm it is ignored by Git.
2. Keep real secrets in local environment files and GitHub Secrets only.
3. Understand that `DATABASE_URL` will point to the PostgreSQL container during local Docker Compose use.
4. Confirm `pnpm-lock.yaml` is committed, because CI and Docker will use it for repeatable dependency installation.

### Commands to practise

```bash
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm build
```

### Done when

- [ ] You can explain which values are secrets and why they are not committed.
- [x] You can build the application locally.
- [ ] You understand that Prisma needs both the schema and database connection details.

## Phase 1, Create a production Docker image

### Why it matters

A Docker image packages the application, its dependencies, and its runtime into one repeatable unit. The same image can run locally, in CI, and on a hosting platform.

### Concepts to learn

- Docker image and container
- Dockerfile instructions
- Multi stage builds
- Build context
- Production dependencies
- Container ports

### Decision

Use `node:22-bookworm-slim` as the base image. It is a stable Debian based Node.js image that works reliably with NestJS and Prisma.

### Implementation work

1. Add a multi stage `Dockerfile`.
2. Install dependencies from `pnpm-lock.yaml` with `pnpm install --frozen-lockfile`.
3. Run `pnpm prisma:generate` before compiling NestJS.
4. Run `pnpm build` to create `dist`.
5. Copy only the runtime files into the final image.
6. Start the API with `node dist/src/main`.
7. Expose port `3000` as the default application port.

### Commands to practise

```bash
docker build -t nestjs-crud-practice:local .
docker run --rm -p 3000:3000 --env-file .env nestjs-crud-practice:local
```

### Done when

- [ ] `docker build` creates an image successfully.
- [ ] The container starts with required environment variables.
- [ ] `GET /` responds from the container.
- [ ] You can explain why the final image should not contain unnecessary build tools.

## Phase 2, Protect the Docker build context

### Why it matters

Docker sends the build context to the Docker engine. Large or sensitive folders make builds slower and can accidentally place secrets inside an image.

### Concepts to learn

- `.dockerignore`
- Image size
- Build cache
- Secret safety

### Implementation work

Add `.dockerignore` to exclude at least:

```text
node_modules
dist
.git
.env
.agents
.claude
coverage
*.log
```

### Done when

- [x] Docker does not receive `.env` or local agent folders as build input.
- [x] Docker builds remain fast after a source only change.
- [ ] You can explain the difference between `.gitignore` and `.dockerignore`.

## Phase 3, Run the API and PostgreSQL with Docker Compose

### Why it matters

The API depends on PostgreSQL. Docker Compose lets us define both services in one file and start them together.

### Concepts to learn

- Docker Compose services
- Service names and container networking
- Volumes and persistent database data
- Health checks
- Environment variable substitution

### Implementation work

1. Add `docker-compose.yml`.
2. Add a `postgres` service with a named volume.
3. Add an `api` service built from the Dockerfile.
4. Give the API a `DATABASE_URL` that uses the Compose service name, for example `postgres`, as the host.
5. Configure the API to wait for the database health check before starting.
6. Provide a local `.env.example` with safe placeholders.

### Commands to practise

```bash
docker compose up --build
docker compose ps
docker compose logs -f api
docker compose down
docker compose down -v
```

### Done when

- [x] One command starts PostgreSQL and the API together.
- [x] PostgreSQL data survives a normal `docker compose down`.
- [ ] `docker compose down -v` removes the local practice database volume.
- [x] The API connects to PostgreSQL through the service name, not `localhost`.

## Phase 4, Run Prisma migrations in containers

### Why it matters

Prisma migrations change the database structure. A fresh database must receive migrations before the API uses its tables.

### Concepts to learn

- Prisma schema
- Migration files
- `prisma migrate deploy`
- Development migrations versus deployment migrations
- Why two application replicas should not migrate at the same time

### Implementation work

1. Copy Prisma schema and migration files into the runtime image.
2. Add a container startup command or entrypoint that runs `prisma migrate deploy` before the API starts for local learning.
3. Verify that an empty PostgreSQL volume receives all migrations automatically.
4. Record that production migrations will later become a separate deployment job.

### Commands to practise

```bash
docker compose down -v
docker compose up --build
docker compose logs api
```

### Done when

- [x] A fresh Docker database receives the Prisma migrations.
- [x] The Hackathon tables exist after startup.
- [x] The API can read or create data after migrations finish.
- [ ] You can explain why `migrate deploy` is used in containers instead of `migrate dev`.

## Phase 5, Prepare safe project scripts for CI

### Why it matters

CI should verify code without changing it. The current lint command uses `--fix`, which is useful locally but not appropriate for CI.

### Concepts to learn

- Continuous integration
- Read only checks
- Lockfiles
- Repeatable builds

### Implementation work

1. Keep the existing `lint` command for local automatic fixes.
2. Add a `lint:check` command that runs ESLint without `--fix`.
3. Confirm the test command works without watch mode.
4. Confirm `pnpm build` succeeds after Prisma Client generation.

### Commands to practise

```bash
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm lint:check
pnpm test
pnpm build
```

### Done when

- [x] CI commands do not modify files.
- [x] Every command exits successfully on your computer.
- [ ] You can explain why CI uses `--frozen-lockfile`.

## Phase 6, Add GitHub Actions continuous integration

### Why it matters

GitHub Actions runs checks automatically after a push or pull request. This catches problems before code is merged or an image is published.

### Concepts to learn

- Workflow
- Job
- Step
- Trigger
- GitHub runner
- Status check

### Implementation work

Create `.github/workflows/ci.yml` that runs on pull requests and pushes to `main`.

The CI job will:

1. Check out the repository.
2. Install Node.js 22.
3. Enable pnpm.
4. Restore the pnpm cache.
5. Install dependencies with `pnpm install --frozen-lockfile`.
6. Generate Prisma Client.
7. Run `pnpm lint:check`.
8. Run `pnpm test`.
9. Run `pnpm build`.
10. Build the Docker image without publishing it.

### Done when

- [ ] A pull request shows a passing CI check.
- [ ] A failed lint, test, or build prevents a green workflow.
- [x] Docker image building is verified on every change.
- [x] Pull requests do not publish images.

## Phase 7, Publish Docker images to Docker Hub

### Why it matters

A container registry stores built images so a server can pull and run the same tested image produced by CI.

### Concepts to learn

- Container registry
- Image repository
- Image tag
- Immutable commit tag
- `latest` tag
- Docker Hub access token
- Registry authentication

### Decision

Use Docker Hub as the public container registry. Create a Docker Hub repository named `nestjs-crud-practice` under your Docker Hub account before enabling image publishing.

The image name will be:

```text
docker.io/<dockerhub-username>/nestjs-crud-practice
```

### Implementation work

1. Create a Docker Hub access token with permission to push images.
2. Store `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` as GitHub Actions secrets.
3. Add a publish job that runs only after CI passes on `main`.
4. Sign in to Docker Hub with the stored secrets.
5. Publish these tags:

```text
latest
sha-<short-git-sha>
```

6. Later, publish a release tag such as `v1.0.0` when a GitHub release is created.
7. Add the image pull command to the README.

### Commands to practise

```bash
docker pull <dockerhub-username>/nestjs-crud-practice:latest
docker run --rm -p 3000:3000 <dockerhub-username>/nestjs-crud-practice:latest
```

### Done when

- [x] A successful push to `main` publishes an image to Docker Hub.
- [x] The `latest` image can be pulled and run locally.
- [x] A commit specific image tag exists for traceability.
- [x] A pull request cannot publish an image.

## Phase 8, Choose deployment and add continuous deployment

### Why it matters

Continuous deployment releases a tested image to a running environment. It should be added only after Docker and CI are understood.

### Concepts to learn

- Deployment environment
- Deployment secrets
- Production database
- Migration job
- Rollback
- Logs and health checks

### Recommended first host

Railway is a beginner friendly option for deploying a Docker image and PostgreSQL database. Render is also a good alternative.

### Implementation work

1. Choose Railway, Render, or another host.
2. Create a production PostgreSQL database.
3. Add production values as GitHub Secrets or hosting provider secrets.
4. Add a deployment workflow that pulls the already published Docker Hub image.
5. Run migrations as a separate deployment step.
6. Deploy only after the CI and image publish jobs succeed.
7. Document rollback by deploying a previous commit tag.

### Done when

- [ ] A push to `main` can deploy a tested image to the chosen host.
- [ ] Production secrets are not in Git.
- [ ] A database migration runs before the new API version serves traffic.
- [ ] You can identify a previous image tag and roll back to it.

## Suggested order of implementation

```text
Phase 1
    Dockerfile
        ↓
Phase 2
    .dockerignore
        ↓
Phase 3
    docker-compose.yml and PostgreSQL
        ↓
Phase 4
    Prisma migrations in containers
        ↓
Phase 5
    Safe CI scripts
        ↓
Phase 6
    GitHub Actions CI
        ↓
Phase 7
    Publish image to Docker Hub
        ↓
Phase 8
    Deployment workflow
```

## Rules to remember

1. Never commit `.env` files, passwords, API keys, or database URLs with real credentials.
2. Never publish a Docker image before lint, tests, and build checks pass.
3. Use the same Docker image in CI, the registry, and deployment.
4. Tag images with the Git commit SHA so a deployment can be traced and rolled back.
5. Use `prisma migrate deploy` in containers and deployment workflows.
6. Treat Docker Compose as a local development tool, not automatically as a production deployment system.
7. Complete and understand one phase before starting the next.

## Progress tracker

- [ ] Phase 0, understand configuration
- [ ] Phase 1, production Docker image
- [ ] Phase 2, Docker build protection
- [ ] Phase 3, Docker Compose with PostgreSQL
- [ ] Phase 4, container migrations
- [ ] Phase 5, CI scripts
- [ ] Phase 6, GitHub Actions CI
- [ ] Phase 7, Docker Hub image publishing
- [ ] Phase 8, deployment workflow
