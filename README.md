# Hackathon Backend

A learning project built with NestJS. It demonstrates a clean backend structure by implementing a Hackathon CRUD API, authentication, role based access control, validation, database relations, and request protection.

The goal of this project is not only to create endpoints. It is to understand how a NestJS application is organised and how a request travels through its layers.

## What this project teaches

- How NestJS modules keep features organised
- How controllers receive HTTP requests
- How services hold application and database logic
- How DTOs validate incoming data
- How Prisma models and migrations describe a PostgreSQL database
- How Better Auth identifies the signed in user
- How roles control who can perform an action
- How Arcjet protects the API from common abusive traffic patterns
- How a response interceptor creates a consistent success response

## Main features

### Hackathon management

Administrators can create, update, and delete hackathons. Anyone can list hackathons or view a single hackathon.

Each hackathon has a name, optional description, start date, end date, active status, and an author.

### Joining a hackathon

Participants can join an active hackathon that has not ended. A participant cannot join the same hackathon twice.

The database enforces this rule with a composite unique constraint on `hackathonId` and `userId`.

### Authentication and roles

The project uses Better Auth with a Prisma adapter. A signed in user has a role of either `PARTICIPANT` or `ADMIN`.

- `ADMIN` can create, update, and delete hackathons.
- `PARTICIPANT` can join a hackathon.
- Read endpoints are public.

## Technology used

| Tool | Why it is used |
| --- | --- |
| NestJS | The backend framework. It provides modules, controllers, services, decorators, guards, and dependency injection. |
| TypeScript | Adds types to JavaScript, which helps catch mistakes before running the app. |
| PostgreSQL | The relational database that stores users, hackathons, and participation records. |
| Prisma | The ORM used to describe the database schema, run migrations, and query PostgreSQL with TypeScript. |
| Better Auth | Handles sign in, sessions, and user identity. |
| `@thallesp/nestjs-better-auth` | Connects Better Auth to NestJS through decorators, guards, and role checks. |
| Arcjet | Adds application protection through a shield rule and request rate limiting. |
| class validator | Validates request data with decorators such as `@IsString()` and `@MinLength()`. |
| class transformer | Converts incoming values, such as ISO date strings, into useful JavaScript types. |

## Project structure

```text
src/
├── app.module.ts
├── main.ts
├── auth.ts
├── common/
│   ├── decorators/
│   │   └── response-message.decorator.ts
│   └── interceptors/
│       └── response.interceptor.ts
├── lib/
│   └── database/
│       ├── prisma.module.ts
│       └── prisma.service.ts
└── module/
    ├── hackathon/
    │   ├── dto/
    │   │   ├── create-hackathon.dto.ts
    │   │   └── update-hackathon.dto.ts
    │   ├── hackathon.controller.ts
    │   ├── hackathon.service.ts
    │   └── hackathon.module.ts
    └── user/
        ├── user.controller.ts
        ├── user.service.ts
        └── user.module.ts

prisma/
├── migrations/
└── schema.prisma
```

This structure separates shared code, database code, and feature code. A new feature can normally live in its own folder under `src/module`.

## NestJS architecture, explained simply

NestJS encourages separation of responsibilities. Each file has one main job.

### Module

A module groups a feature together. The `HackathonModule` tells NestJS that the Hackathon controller and service belong to the same feature.

```ts
@Module({
  controllers: [HackathonController],
  providers: [HackathonService],
})
export class HackathonModule {}
```

Think of a module as a feature folder with a clear boundary.

### Controller

A controller handles the HTTP layer. It receives the URL, request body, route parameters, and authenticated session. It should be thin: it passes work to a service instead of writing database logic itself.

For example, the controller gets the current signed in user from `@Session()` and passes the user ID to the service when an admin creates a hackathon.

```ts
return this.hackathonService.create(createHackathonDto, session.user.id);
```

This is important because clients should never be allowed to send their own `authorId` in the request body.

### Service

A service contains the application rules and database operations. `HackathonService` is responsible for tasks such as:

- Creating a hackathon with the authenticated author ID
- Looking up one or many hackathons
- Throwing a `NotFoundException` when an ID does not exist
- Checking whether a participant may join
- Preventing duplicate joins
- Calling Prisma to read and write the database

Keeping this work in a service makes controllers easier to read and makes business rules reusable.

### DTO

DTO means Data Transfer Object. A DTO describes what data the API accepts.

`CreateHackathonDto` validates a create request before the controller or service uses it.

```ts
export class CreateHackathonDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description?: string;

  @Type(() => Date)
  @IsDate()
  @MinDate(() => new Date())
  startsAt!: Date;
}
```

The `UpdateHackathonDto` has the same rules, but all fields are optional because an update may change only one field.

### Dependency injection

NestJS creates and provides services for us. This is called dependency injection.

```ts
constructor(private readonly prisma: PrismaService) {}
```

The service does not create `PrismaService` itself. NestJS supplies the configured instance. This makes the application easier to test and avoids creating unnecessary database connections.

## How a request flows through the backend

The following is the usual path for a request such as `POST /hackathon/:id/join`.

```text
Client request
    |
    v
Arcjet protection rules
    |
    v
Better Auth guard checks the session
    |
    v
Roles decorator checks that the user is a PARTICIPANT
    |
    v
HackathonController receives the route parameter and session
    |
    v
HackathonService applies the business rules
    |
    v
PrismaService reads or writes PostgreSQL
    |
    v
ResponseInterceptor formats the successful response
    |
    v
Client receives JSON
```

The exact decorators make the request rules visible in the controller, while the service remains focused on the actual feature logic.

## Validation flow

`main.ts` registers one global `ValidationPipe`. This means DTO validation runs automatically for every controller method that receives a DTO.

The pipe is configured to:

- Transform incoming values into DTO types. For example, date strings become `Date` objects through `@Type(() => Date)`.
- Remove unknown properties with `whitelist: true`.
- Return a clean list of validation errors through `BadRequestException`.

Example invalid input:

```json
{
  "name": "AI",
  "startsAt": "not a date"
}
```

Example validation result inside NestJS's standard bad request response:

```json
[
  {
    "property": "name",
    "message": "name must be longer than or equal to 3 characters"
  },
  {
    "property": "startsAt",
    "message": "startsAt must be a Date instance"
  }
]
```

## Authentication, authorization, and Better Auth

`auth.ts` configures Better Auth with the Prisma adapter. Better Auth stores its user, account, session, and verification data in PostgreSQL.

The NestJS integration provides these useful decorators and guards:

| Tool | Purpose in this project |
| --- | --- |
| `@UseGuards(AuthGuard)` | Requires a valid user session for the Hackathon controller. |
| `@AllowAnonymous()` | Marks the read routes as public. |
| `@Roles(['ADMIN'])` | Allows only administrators to create, update, or delete hackathons. |
| `@Roles(['PARTICIPANT'])` | Allows participants to join a hackathon. |
| `@Session()` | Gives the controller the signed in user and session information. |

Authentication answers, “Who is this user?” Authorization answers, “Is this user allowed to do this action?” This project uses both.

In Render, Better Auth reads the `x-forwarded-for` header supplied by the platform to identify the visitor for authentication rate limits. Without this configuration, every proxied request can fall into one shared rate-limit bucket.

## Arcjet protection

Arcjet is configured globally in `AppModule`.

It currently uses:

- `shield()`, which adds protection against suspicious or malicious requests.
- `slidingWindow()`, which allows up to 100 requests in one minute before rate limiting applies.

Arcjet is useful because security and abuse protection should be handled before a request reaches expensive database work.

When deployed behind Render, `main.ts` trusts one reverse-proxy hop with `app.set('trust proxy', 1)`. This lets Express expose the visitor IP through `req.ip`, allowing Arcjet's IP-based rate limit to create a separate fingerprint for each visitor instead of seeing only the hosting proxy.

## Database design

The Prisma schema contains two important Hackathon models.

### Hackathon

```text
Hackathon
├── id
├── name
├── description
├── startDate
├── endDate
├── isActive
├── authorId
└── author: User
```

A hackathon belongs to one user through `authorId`. The API accepts `startsAt` and `endsAt`, then the service maps them to Prisma's `startDate` and `endDate` fields.

### HackathonParticipant

```text
HackathonParticipant
├── id
├── hackathonId
├── userId
└── joinedAt
```

This is a join table. It represents a many to many relationship:

- One hackathon can have many participants.
- One user can join many hackathons.

The following Prisma rule prevents duplicate joins at the database level:

```prisma
@@unique([hackathonId, userId])
```

The service also checks for an existing participant before creating one. The database constraint remains important because it protects the rule even if two join requests arrive at nearly the same time.

## API routes

Base URL during local development: `http://localhost:3000`

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/hackathon` | Public | List all hackathons. |
| `GET` | `/hackathon/:id` | Public | Get one hackathon. |
| `POST` | `/hackathon` | Admin | Create a hackathon. The author comes from the signed in session. |
| `PATCH` | `/hackathon/:id` | Admin | Update part or all of a hackathon. |
| `DELETE` | `/hackathon/:id` | Admin | Delete a hackathon. |
| `POST` | `/hackathon/:id/join` | Participant | Join an active hackathon that has not ended. No request body is needed. |

### Create hackathon example

```json
{
  "name": "AI Innovation Challenge",
  "description": "A three day hackathon focused on practical artificial intelligence projects.",
  "startsAt": "2030-08-20T09:00:00.000Z",
  "endsAt": "2030-08-22T17:00:00.000Z",
  "isActive": true
}
```

### Update hackathon example

```json
{
  "description": "An updated three day hackathon focused on useful AI projects.",
  "isActive": false
}
```

### Join hackathon example

```bash
curl -X POST http://localhost:3000/hackathon/HACKATHON_ID/join \
  --cookie "better-auth.session_token=YOUR_SESSION_TOKEN"
```

The exact session cookie is created by Better Auth after sign in. The important idea is that the API gets the participant ID from the session, not from client supplied JSON.

## Success response format

`ResponseInterceptor` wraps successful controller responses in one predictable format.

```json
{
  "statusCode": 201,
  "message": "Hackathon created successfully",
  "data": {
    "id": "..."
  }
}
```

Write operations use `@ResponseMessage()` so the response explains what succeeded.

## Local setup

### Requirements

- Node.js 22 or later
- pnpm
- A PostgreSQL database
- Arcjet credentials
- Better Auth configuration

### Install dependencies

```bash
pnpm install
```

### Create environment variables

Create a `.env` file in the project root. Never commit real secrets.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
ARCJET_KEY="replace-with-your-arcjet-key"
ARCJET_MODE="DRY_RUN"
ARCJET_ENV="development"
```

Use `ARCJET_MODE="LIVE"` only when you are ready for Arcjet rules to actively enforce protection in a real environment.

### Create the database tables

For local development, create and apply a migration:

```bash
pnpm prisma:migrate
```

Generate the Prisma client after schema changes:

```bash
pnpm prisma:generate
```

For a deployment environment, apply existing migrations with:

```bash
pnpm prisma:deploy
```

### Run the application

```bash
pnpm start:dev
```

The API starts at `http://localhost:3000` unless `PORT` is set.

### Run with Docker Compose

Docker Compose keeps the Docker commands short. Docker Desktop must be running, and the project root must contain your local `.env` file.

Compose starts both the NestJS API and a local PostgreSQL database. The API uses `postgres` as the database hostname inside Docker, not `localhost`. The Compose database URL overrides the `DATABASE_URL` in `.env`, so your Docker practice environment does not use your external database. Copy `.env.example` when you need a safe starting point for local Docker values.

Before the API starts, Compose runs a one-off `migrate` service. It uses `prisma migrate deploy` to apply the committed migration files to the local Docker database, then exits successfully. The API waits for that success before it starts. This means a fresh Docker database receives the `Hackathon` and `HackathonParticipant` tables automatically.

If you previously started the API with a plain `docker run` command, release port `3000` once before switching to Compose:

```bash
docker stop nestjs-crud-practice
docker rm nestjs-crud-practice
```

Start the Docker version of the API:

```bash
pnpm docker:up
```

Open `http://localhost:3000` in your browser or API client.

| pnpm command | Runs | Purpose |
| --- | --- |
| `pnpm docker:up` | `docker compose up -d` | Start the API and PostgreSQL in the background. |
| `pnpm docker:up:build` | `docker compose up -d --build` | Rebuild after code or Dockerfile changes, then start the services. |
| `pnpm docker:down` | `docker compose down` | Stop and remove the Compose containers and network. The Docker image and database volume remain. |
| `pnpm docker:status` | `docker compose ps` | Show the API and database container status. |
| `pnpm docker:logs` | `docker compose logs -f api` | View live API logs. Press `Ctrl + C` to stop viewing logs. |
| `pnpm docker:migrate` | `docker compose run --rm migrate` | Run the committed Prisma migrations manually when needed. |
| `pnpm docker:db:reset` | `docker compose down -v` | Permanently delete the local PostgreSQL data volume. Use only when you want a fresh database. |

Do not run `pnpm start:dev` and `docker compose up -d` at the same time because both use port `3000`.

### Docker build safety

`.gitignore` controls which files Git does not track. `.dockerignore` controls which files Docker does not send to its build engine. Both files ignore `.env`, but they solve different problems: Git prevents accidentally committing secrets, while Docker prevents secrets and unnecessary local files from entering a build context or image.

## Useful commands

| Command | Purpose |
| --- | --- |
| `pnpm start:dev` | Start NestJS in watch mode. |
| `pnpm build` | Compile the project and catch TypeScript errors. |
| `pnpm lint` | Check and fix linting issues. |
| `pnpm lint:check` | Check linting without modifying files. This is the CI command. |
| `pnpm test` | Run unit tests. It currently passes when no tests exist, so add tests as the project grows. |
| `pnpm prisma:generate` | Regenerate Prisma Client after a schema change. |
| `pnpm prisma:migrate` | Create and apply a development migration. |
| `pnpm prisma:deploy` | Apply existing migrations in a deployment environment. |

### CI verification commands

Run this read-only sequence before pushing changes or when you want to reproduce the future GitHub Actions checks locally:

```bash
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm lint:check
pnpm test
pnpm build
```

`--frozen-lockfile` makes pnpm use the exact dependency versions already recorded in `pnpm-lock.yaml`. It fails instead of silently changing the lockfile, so your computer and CI install the same dependency tree.

### CI/CD workflow: from code push to live API

This project uses GitHub Actions, Docker Hub, Render, and Neon together. The workflow is designed to prevent an unverified change from becoming a deployable Docker image.

```text
Developer changes code
        |
        v
Push or pull request on GitHub
        |
        v
GitHub Actions validates the application
        |
        +-- failed -> workflow stops; no image is published
        |
        v
Push to main only: publish versioned image to Docker Hub
        |
        v
Render deploys the latest approved image
        |
        v
Container applies Prisma migrations to Neon
        |
        v
NestJS starts and Render health check confirms the API is live
```

The workflow configuration lives in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

#### Step 1: a developer pushes code

For example, after finishing a feature or fix:

```bash
git add .
git commit -m "Describe the change"
git push origin main
```

GitHub Actions starts automatically for every push to `main` and for every pull request targeting `main`. You can view each run in the repository's **Actions** tab.

#### Step 2: Continuous Integration validates the change

The `validate` job runs these checks in order:

| Check | Command | Why it matters |
| --- | --- | --- |
| Install exact dependencies | `pnpm install --frozen-lockfile` | Makes local and CI dependency versions consistent. |
| Generate Prisma Client | `pnpm prisma:generate` | Ensures database types match the Prisma schema. |
| Check code quality | `pnpm lint:check` | Finds linting and unsafe TypeScript issues without changing files. |
| Run tests | `pnpm test` | Runs automated tests when they exist. |
| Compile NestJS | `pnpm build` | Catches TypeScript and build errors. |
| Build Docker image | `docker build` | Proves the application can be packaged for deployment. |

If any check fails, the workflow stops. Docker Hub receives no new image, so Render cannot deploy that broken version.

#### Step 3: Continuous Delivery publishes the image

The `publish` job runs only when all validation checks pass **and** the event is a push to `main`. Pull requests are validated, but they never publish an image.

GitHub Actions logs in to Docker Hub with repository secrets, builds the production image, and pushes it to:

```text
docker.io/sujalstha/nestjs-crud-practice
```

Before the first publish, create a Docker Hub repository named `nestjs-crud-practice`, then add these GitHub repository secrets:

| Secret | Value |
| --- | --- |
| `DOCKERHUB_USERNAME` | Your Docker Hub username. |
| `DOCKERHUB_TOKEN` | A Docker Hub personal access token with permission to push images. |

Each successful publish creates two image tags:

| Tag | Purpose |
| --- | --- |
| `latest` | The most recently approved image. Render uses this tag for the learning deployment. |
| `sha-<short-commit-sha>` | An immutable reference to the exact Git commit that created the image. Useful for debugging and rollback. |

For example, a commit with short SHA `25b8467` produces:

```text
sujalstha/nestjs-crud-practice:latest
sujalstha/nestjs-crud-practice:sha-25b8467
```

#### Step 4: Render runs the container

Render pulls the `latest` image from Docker Hub when you select **Manual Deploy** then **Deploy latest image**. This project currently uses this manual final deployment step so you can inspect the published image before it becomes live.

The container starts with `docker/start-production.sh`:

```text
prisma migrate deploy
        |
        v
node dist/src/main
```

`prisma migrate deploy` applies only the migration files already committed to `prisma/migrations`. This prepares a fresh Neon database before NestJS begins serving requests. Render then calls the `/` health-check endpoint; a successful response marks the service as live.

#### Step 5: secrets stay outside Git and Docker

Render injects runtime configuration through protected environment variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Connection to the Neon PostgreSQL database. |
| `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` | Better Auth public URL and session security. |
| `ARCJET_KEY` | Arcjet request protection. |
| `PORT` | The port Render exposes, `3000` for this API. |

These values are not committed to Git, included in the Docker image, or stored in GitHub Actions logs.

#### What CI and CD mean here

| Term | Meaning in this project |
| --- | --- |
| Continuous Integration (CI) | Automatically validates every proposed code change through install, Prisma generation, linting, tests, build, and Docker build steps. |
| Continuous Delivery (CD) | Automatically creates and publishes a deployable Docker image after CI succeeds on `main`. |
| Deployment | The final action that makes the image live. It is currently triggered manually in Render after you review the successful GitHub Actions run. |

After the first successful publish, pull the image with:

```bash
docker pull sujalstha/nestjs-crud-practice:latest
```

## Deploying the Docker image with Render and Neon

This project can be deployed without Railway by using Render for the NestJS API and Neon for PostgreSQL:

```text
GitHub Actions -> Docker Hub -> Render Web Service -> Neon PostgreSQL
```

Render pulls the published Docker Hub image, while Neon keeps the database separate from the application container. This is important because a container's local filesystem is temporary.

### 1. Create a Neon PostgreSQL database

1. Create a free project at [Neon](https://neon.com/).
2. Create a database, then copy its pooled PostgreSQL connection string.
3. Keep it private. It becomes the `DATABASE_URL` environment variable in Render.

### 2. Create a Render Web Service

1. In [Render](https://dashboard.render.com/), choose **New** then **Web Service**.
2. Choose **Deploy an existing image from a registry**.
3. Use this public Docker image:

   ```text
   docker.io/sujalstha/nestjs-crud-practice:latest
   ```

4. Set the service port to `3000`.
5. Set the health-check path to `/`.
6. Add the environment variables below in Render's **Environment** tab. Do not add them to GitHub or commit them to `.env`.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled PostgreSQL connection string |
| `BETTER_AUTH_URL` | Your final `https://...onrender.com` service URL |
| `BETTER_AUTH_SECRET` | A new long, random production secret |
| `ARCJET_KEY` | Your Arcjet production key |
| `ARCJET_MODE` | `DRY_RUN` while learning, then `LIVE` when ready to enforce rules |
| `ARCJET_ENV` | `production` |
| `PORT` | `3000` |

The production image runs `prisma migrate deploy` before NestJS starts. It applies only migration files already committed to `prisma/migrations`, so a fresh Neon database receives the required tables automatically.

### 3. Verify the deployment

After Render reports that the deploy is live, open the Render service URL in a browser. The root endpoint should return the application's success response. Then open the Render log stream and confirm these messages appear:

```text
Applying Prisma migrations...
Starting the NestJS API...
Nest application successfully started
```

### Free-tier expectations

Render is suitable for this practice project. Its free Web Service can spin down after inactivity, so the next request may take about a minute to wake it up. The application data remains safe in Neon because it is stored in PostgreSQL rather than in the container.

### Updating the deployed image

Every successful push to `main` publishes both `latest` and a traceable `sha-<commit>` image tag to Docker Hub. In Render, select **Manual Deploy** and choose **Deploy latest image** after a new publish. For reproducible releases, change the Render image to a specific `sha-<commit>` tag instead of `latest`.

## Key learning points

1. Keep controllers thin. They translate HTTP requests into service calls.
2. Keep business rules in services. This makes the code easier to reuse and test.
3. Validate request data with DTOs before it reaches database logic.
4. Use authentication to identify the user, then use authorization to decide what that user can do.
5. Enforce important rules in the database as well as application code when possible.
6. Use modules to keep every feature independent and easy to find.
7. Use dependency injection instead of manually creating services or database clients.
8. Add global concerns, such as validation, response formatting, authentication, and traffic protection, in one central place.

## License

This is a personal learning project.
