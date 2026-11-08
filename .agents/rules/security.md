# Security & Sensitive Data

## Sensitive Fields
The following fields are classified as SENSITIVE and require 
special handling throughout the system:

| Entity | Sensitive Fields |
|--------|-----------------|
| Device | `mac_address`, `device_key`, `username` |
| User | `password_hash`, `refresh_token` |
| Customer | `phone`, `address` |

## Rules

### Never Log Sensitive Data
- **NEVER** log MAC addresses, device keys, or usernames to stdout, 
  files, or external services.
- **NEVER** include sensitive fields in error responses or stack traces.
- Use `@Exclude()` from `class-transformer` on sensitive entity 
  properties to prevent accidental serialization.

### Password Security
- Hash passwords with **bcryptjs** using **12 salt rounds**.
- Never store plaintext passwords anywhere.
- Never return `password_hash` in any API response.
- Refresh tokens are stored hashed (bcrypt) in the database.

### API Response Serialization
- Use `ClassSerializerInterceptor` globally to auto-apply `@Exclude()`.
- Create explicit Response DTOs for every endpoint that returns data.
- Never return raw TypeORM entities directly from controllers.

### URL Security
- Customer phone numbers and addresses MUST NOT appear in URL 
  query parameters — use POST body or route params.
- Device MAC addresses MUST NOT appear in URLs — use POST body.
- Search endpoints that accept MAC/phone use POST body, not GET params.

### Authentication Security
- JWT access tokens expire in **15 minutes**.
- JWT refresh tokens expire in **7 days** and are single-use 
  (rotation on every refresh).
- Failed login attempts should NOT reveal whether the email or 
  password was wrong — use generic "Invalid credentials" message.
- Rate limit the login endpoint: **5 attempts per minute per IP**.

### HTTP Security Headers
- Apply `helmet()` middleware globally.
- Enable CORS only for known origins (`http://localhost:4200` in dev).
- Set `X-Content-Type-Options: nosniff`.
- Set `X-Frame-Options: DENY`.

### Database Security
- Use parameterized queries (TypeORM handles this by default).
- Never concatenate user input into raw SQL strings.
- Database credentials in `.env` only — never committed to git.
