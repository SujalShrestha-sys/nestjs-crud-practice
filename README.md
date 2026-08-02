# Hackathon Backend

A learning project built with NestJS. It demonstrates a clean backend structure by implementing a Hackathon management API, project submissions, user profiles, authentication, role-based access control, OpenAPI/Swagger documentation, database relations, health checks, exception filters, and request protection.

The goal of this project is not only to create endpoints. It is to understand how a NestJS application is organized and how a request travels through its layers.

## What this project teaches

- How NestJS modules keep features organized
- How controllers receive HTTP requests and route params
- How services hold application rules and database operations
- How DTOs validate incoming data and document Swagger schemas
- How Prisma models and migrations describe a PostgreSQL database
- How Better Auth identifies the signed-in user
- How roles control who can perform an action
- How Arcjet protects the API from common abusive traffic patterns
- How a global response interceptor creates consistent success responses
- How a global exception filter creates consistent error responses
- How to generate interactive OpenAPI/Swagger documentation (`/docs`)
- How to implement health probes (`/health`)
- How to structure and write unit tests with Jest

## Main features

### Hackathon management & search
- Administrators can create, update, and delete hackathons. Anyone can list hackathons or view a single hackathon.
- Supports pagination (`page`, `limit`), status filtering (`active`, `upcoming`, `ended`), and keyword searching (`q`).
- Each hackathon has a name, description, start date, end date, active status, and an author.

### Joining & leaving a hackathon
- Participants can join an active hackathon that has not ended, or leave a hackathon they previously joined.
- The database enforces uniqueness with a composite unique constraint on `hackathonId` and `userId`.
- Public endpoint available to view all participants registered for a hackathon.

### Project Submissions
- Registered participants can submit their project entries for hackathons they have joined.
- Submissions include project title, detailed description, GitHub repository link (`repoUrl`), and optional live demo link (`demoUrl`).
- One project submission per participant per hackathon. Submitters or admins can remove submissions.

### User Self-Management & Roles
- Authenticated users can view their profile (`/user/me`), update profile information (`PATCH /user/me`), and view all hackathons they have joined (`/user/me/hackathons`).
- Role-based access control divides permissions between `ADMIN` and `PARTICIPANT`.

### Interactive API Documentation & Health Checks
- Swagger UI available at `/docs` with endpoint descriptions and interactive request testing.
- Live health check probe at `/health` reporting server uptime and database connectivity.

## Technology used

| Tool | Why it is used |
| --- | --- |
| NestJS | The backend framework. Provides modules, controllers, services, decorators, guards, and dependency injection. |
| TypeScript | Adds types to JavaScript, which helps catch mistakes before running the app. |
| PostgreSQL | Relational database storing users, hackathons, participation records, and project submissions. |
| Prisma | ORM used to describe the schema, run migrations, and query PostgreSQL safely with TypeScript. |
| Better Auth | Handles sign-in, sessions, and user identity. |
| `@thallesp/nestjs-better-auth` | Connects Better Auth to NestJS through decorators, guards, and role checks. |
| `@nestjs/swagger` | Generates OpenAPI specification and interactive Swagger UI documentation. |
| Arcjet | Adds application protection through shield rules and sliding-window rate limiting. |
| class validator | Validates request data with decorators such as `@IsString()` and `@MinLength()`. |
| class transformer | Converts incoming values (such as ISO date strings and numbers) into JavaScript types. |
| Jest | Automated testing framework for unit tests. |

## Project structure

```text
src/
├── app.module.ts
├── main.ts
├── auth.ts
├── common/
│   ├── decorators/
│   │   └── response-message.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
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
    │   │   ├── query-hackathon.dto.ts
    │   │   └── update-hackathon.dto.ts
    │   ├── hackathon.controller.ts
    │   ├── hackathon.service.ts
    │   ├── hackathon.service.spec.ts
    │   └── hackathon.module.ts
    ├── health/
    │   ├── health.controller.ts
    │   └── health.module.ts
    ├── submission/
    │   ├── dto/
    │   │   └── create-submission.dto.ts
    │   ├── submission.controller.ts
    │   ├── submission.service.ts
    │   ├── submission.service.spec.ts
    │   └── submission.module.ts
    └── user/
        ├── dto/
        │   └── update-user.dto.ts
        ├── user.controller.ts
        ├── user.service.ts
        ├── user.service.spec.ts
        └── user.module.ts

prisma/
├── migrations/
└── schema.prisma
```

## NestJS architecture, explained simply

### Module
A module groups a feature together. For instance, `SubmissionModule` connects `SubmissionController` and `SubmissionService`.

### Controller
Handles HTTP requests, path parameters, query parameters, DTO payloads, and authenticated sessions. It passes business logic to services.

### Service
Contains core domain rules and Prisma database calls (e.g., checking participant status before creating project submissions).

### DTO (Data Transfer Object)
Validates request inputs via `class-validator` and decorates OpenAPI properties with `@ApiProperty()` for Swagger documentation.

## How a request flows through the backend

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
Roles decorator checks permissions (ADMIN / PARTICIPANT)
    |
    v
ValidationPipe validates DTO inputs
    |
    v
Controller processes route parameters & session
    |
    v
Service executes business rules & queries Prisma
    |
    v
ResponseInterceptor formats success output OR AllExceptionsFilter catches errors
    |
    v
Client receives standard JSON response
```

## Database design

### Hackathon
Belongs to an author (`User`). Has start/end dates, active status, participant join records, and project submissions.

### HackathonParticipant
Join table creating a many-to-many relationship between `User` and `Hackathon`. Enforces unique joins via `@@unique([hackathonId, userId])`.

### Submission
Stores project entries submitted by participants for a hackathon:
- `title`, `description`, `repoUrl`, `demoUrl`
- Enforces one submission per participant per hackathon via `@@unique([hackathonId, userId])`.

## API routes

Base URL during local development: `http://localhost:3000`

### General & Docs
| Method | Route | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | System status and PostgreSQL database liveness check. |
| `GET` | `/docs` | Public | Interactive OpenAPI / Swagger UI documentation. |

### Hackathon Management
| Method | Route | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/hackathon` | Public | List hackathons with pagination (`page`, `limit`), filter (`status`), and search (`q`). |
| `GET` | `/hackathon/:id` | Public | Get single hackathon details. |
| `GET` | `/hackathon/:id/participants` | Public | List users registered for a hackathon. |
| `POST` | `/hackathon` | Admin | Create a hackathon. |
| `PATCH` | `/hackathon/:id` | Admin | Update a hackathon. |
| `DELETE` | `/hackathon/:id` | Admin | Delete a hackathon. |
| `POST` | `/hackathon/:id/join` | Participant | Join an active hackathon. |
| `DELETE` | `/hackathon/:id/leave` | Participant | Leave / unjoin a hackathon. |

### Submissions
| Method | Route | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/hackathon/:hackathonId/submission` | Participant | Submit a project entry for a joined hackathon. |
| `GET` | `/hackathon/:hackathonId/submissions` | Public | List all project submissions for a hackathon. |
| `GET` | `/submission/:id` | Public | Get single submission details. |
| `DELETE` | `/submission/:id` | Submitter/Admin | Delete a project submission. |

### User Self-Management
| Method | Route | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/user/me` | Authenticated | Get signed-in user profile. |
| `PATCH` | `/user/me` | Authenticated | Update user profile (`name`, `image`). |
| `GET` | `/user/me/hackathons` | Authenticated | Get list of hackathons joined by signed-in user. |
| `GET` | `/user/all` | Admin | List all registered users. |
| `GET` | `/user/:id` | Public | Get user profile by ID. |

## Success & Error Response Formats

### Success Response
```json
{
  "statusCode": 200,
  "message": "Hackathons retrieved successfully",
  "data": {
    "items": [...],
    "meta": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "property": "repoUrl", "message": "repoUrl must be a URL address" }
  ],
  "statusCode": 400,
  "timestamp": "2026-08-02T08:30:00.000Z"
}
```

## Local Setup & Development

### 1. Requirements
- Node.js 22 or later
- pnpm
- PostgreSQL database

### 2. Install dependencies
```bash
pnpm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
ARCJET_KEY="replace-with-your-arcjet-key"
ARCJET_MODE="DRY_RUN"
```

### 4. Database Migrations & Client Generation
```bash
pnpm prisma:migrate
pnpm prisma:generate
```

### 5. Run the Application
```bash
pnpm start:dev
```
Open **[http://localhost:3000/docs](http://localhost:3000/docs)** to test endpoints in Swagger UI.

### 6. Run Unit Tests
```bash
pnpm test
```

### 7. Run with Docker Compose
```bash
pnpm docker:up
```
To stop container services:
```bash
pnpm docker:down
```
