# Tech Stack

## Framework & Runtime
- **NestJS 11** (latest stable) — strict TypeScript mode
- **Node.js 20 LTS** minimum
- **TypeScript 5.5+** with `strict: true` in tsconfig

## Database
- **MySQL 8.0+** — relational, every table has `tenant_id`
- **TypeORM 0.3.x** with `@nestjs/typeorm` — decorators-based entities
- **Migrations**: TypeORM CLI-generated migrations, never `synchronize: true` 
  in production. Use `synchronize: true` ONLY in development.

## Authentication & Authorization
- **Passport.js** with `passport-jwt` and `passport-local` strategies
- **@nestjs/jwt** for signing/verifying JWT tokens
- **bcryptjs** for password hashing (salt rounds: 12)
- Access token expiry: **15 minutes**
- Refresh token expiry: **7 days**
- Refresh tokens stored hashed in `users.refresh_token` column

## Validation & Serialization
- **class-validator** — decorators on every DTO property
- **class-transformer** — `@Exclude()` for sensitive fields in responses
- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`,
  `transform: true`

## API Documentation
- **@nestjs/swagger** — every controller/DTO must have Swagger decorators
- OpenAPI spec served at `/api/docs`

## Security
- **helmet** — secure HTTP headers
- **@nestjs/throttler** — rate limiting (default: 60 requests per minute)
- **CORS** enabled for `http://localhost:4200` (Angular dev server)

## Logging
- **nestjs-pino** with `pino-pretty` in dev — structured JSON in production
- Request ID auto-generated per request

## Testing
- **Jest** — unit tests for services, e2e tests for controllers
- File naming: `*.spec.ts` for unit, `*.e2e-spec.ts` for integration

## Package Management
- Use **npm** (not yarn/pnpm)
- Pin exact versions for security-critical packages (bcryptjs, passport)

## Code Style
- ESLint with `@typescript-eslint` and NestJS defaults
- Prettier with default config
- No `any` types — always provide explicit types
- Prefer `readonly` properties on injected services
