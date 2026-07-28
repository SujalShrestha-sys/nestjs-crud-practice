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

## Arcjet protection

Arcjet is configured globally in `AppModule`.

It currently uses:

- `shield()`, which adds protection against suspicious or malicious requests.
- `slidingWindow()`, which allows up to 100 requests in one minute before rate limiting applies.

Arcjet is useful because security and abuse protection should be handled before a request reaches expensive database work.

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

## Useful commands

| Command | Purpose |
| --- | --- |
| `pnpm start:dev` | Start NestJS in watch mode. |
| `pnpm build` | Compile the project and catch TypeScript errors. |
| `pnpm lint` | Check and fix linting issues. |
| `pnpm test` | Run unit tests. |
| `pnpm prisma:generate` | Regenerate Prisma Client after a schema change. |
| `pnpm prisma:migrate` | Create and apply a development migration. |
| `pnpm prisma:deploy` | Apply existing migrations in a deployment environment. |

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
