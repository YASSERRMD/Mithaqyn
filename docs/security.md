# Security Guide

## Authentication

- **JWT** (RS256 optional / HS256 default) with configurable expiry (`JWT_EXPIRES_IN`)
- Tokens are stored in `localStorage` on the client and sent as `Authorization: Bearer <token>`
- `lastLoginAt` is updated on each successful login for audit purposes
- Failed logins are not rate-limited at the service level — apply rate limiting at the reverse proxy

## RBAC

Six role levels are enforced via `RolesGuard` + `@Roles()` decorator:

| Level | Role | Permissions |
|-------|------|-------------|
| 6 | SUPER_ADMIN | Everything, including user management and AI provider config |
| 5 | LEGAL_ADMIN | All contract operations, team management |
| 4 | CONTRACT_MANAGER | CRUD contracts, trigger AI analysis |
| 3 | REVIEWER | Review clauses, annotate risks |
| 2 | AUDITOR | Read-only all data, including audit logs |
| 1 | VIEWER | Read-only assigned contracts |

A user with role level N can access any route requiring level ≤ N.

## API Security

- **Helmet.js** sets security headers (CSP, HSTS, X-Frame-Options, etc.)
- **NestJS Throttler**: 100 requests/60 seconds per IP (configurable via `THROTTLE_TTL` / `THROTTLE_LIMIT`)
- **CORS**: Only origins matching `CORS_ORIGIN` env var are accepted (defaults to `http://localhost:3000`)
- **ValidationPipe**: All request bodies are validated via `class-validator`; unknown properties are stripped

## File Upload Security

- Allowed MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`, `application/rtf`
- Allowed extensions: `.pdf`, `.doc`, `.docx`, `.txt`, `.rtf`
- Maximum file size: 50 MB (configurable via `MAX_FILE_SIZE_MB`)
- Files are renamed to UUID to prevent path traversal and filename injection

## AI Provider Key Storage

- Provider API keys are read from environment variables at runtime, never persisted to the database
- When using the `AIProviderConfig` table (for UI-managed provider overrides), keys should be encrypted before storage
- Recommended: use a secrets manager (AWS Secrets Manager, HashiCorp Vault) in production

## Audit Logging

All sensitive actions should be decorated with `@Audit(action, entityType)`:

```typescript
@Audit('CONTRACT_DELETED', 'CONTRACT')
@Delete(':id')
remove(@Param('id') id: string) { ... }
```

Audit log entries include: userId, action, entityType, entityId, ipAddress, userAgent, timestamp.

Logs are queryable by AUDITOR+ roles at `GET /admin/audit` and exportable as CSV.

## Secrets Checklist

Before deploying to production, ensure:

- [ ] `JWT_SECRET` is at least 64 random bytes (`openssl rand -base64 64`)
- [ ] `DATABASE_URL` uses a dedicated database user with minimal privileges
- [ ] `REDIS_URL` includes authentication password
- [ ] AI provider keys are rotated periodically
- [ ] `.env` files are never committed (`.gitignore` excludes them)
- [ ] `NODE_ENV=production` is set

## Dependency Updates

Run `yarn audit` regularly and apply patches. NestJS, Prisma, and passport packages are
security-sensitive and should be kept current.
