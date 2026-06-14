# API Reference

Base URL: `http://localhost:3001`
Interactive docs: `http://localhost:3001/api/docs`

All protected endpoints require `Authorization: Bearer <token>`.

## Auth

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| POST | `/auth/login` | — | Login with email + password |
| POST | `/auth/register` | — | Register new user |
| GET | `/auth/me` | VIEWER | Get current user profile |
| POST | `/auth/logout` | VIEWER | Logout (client-side token clear) |

## Contracts

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| GET | `/contracts` | VIEWER | List contracts (paginated, filterable) |
| POST | `/contracts` | CONTRACT_MANAGER | Create contract |
| GET | `/contracts/:id` | VIEWER | Get contract detail |
| PATCH | `/contracts/:id` | CONTRACT_MANAGER | Update contract |
| DELETE | `/contracts/:id` | LEGAL_ADMIN | Delete contract |
| POST | `/contracts/:id/documents` | CONTRACT_MANAGER | Upload document |
| GET | `/contracts/:id/documents` | VIEWER | List documents |

Query params for `GET /contracts`: `search`, `type`, `status`, `riskLevel`, `sortBy`, `sortOrder`, `page`, `limit`

## Clauses

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| POST | `/contracts/:id/extract-clauses` | CONTRACT_MANAGER | Run AI clause extraction |
| GET | `/contracts/:id/clauses` | VIEWER | List extracted clauses |
| PATCH | `/clauses/:id/review` | REVIEWER | Approve / flag a clause |

## Risk Analysis

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| POST | `/contracts/:id/analyze-risks` | CONTRACT_MANAGER | Run AI risk analysis |
| GET | `/contracts/:id/risks` | VIEWER | List risk findings |
| PATCH | `/risks/:id/status` | REVIEWER | Update risk status |

## Obligations

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| POST | `/contracts/:id/extract-obligations` | CONTRACT_MANAGER | Run AI obligation extraction |
| GET | `/obligations` | VIEWER | List all obligations (filterable) |
| GET | `/obligations/overdue` | VIEWER | List overdue obligations |
| GET | `/contracts/:id/obligations` | VIEWER | List obligations for a contract |
| PATCH | `/obligations/:id` | REVIEWER | Update obligation status / fields |

## Renewals

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| POST | `/contracts/:id/predict-renewal` | CONTRACT_MANAGER | Run AI renewal prediction |
| GET | `/renewals` | VIEWER | List upcoming renewals |
| GET | `/renewals/stats` | VIEWER | Renewal dashboard stats |
| GET | `/contracts/:id/renewals` | VIEWER | Renewal events for a contract |

## Contract Comparison

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| POST | `/comparison/contracts` | REVIEWER | Compare two contracts with AI |
| POST | `/comparison/versions` | REVIEWER | Compare two versions of a contract |

## Dashboard

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| GET | `/dashboard/stats` | VIEWER | All KPIs, recent contracts, recent AI activity |
| GET | `/dashboard/trend` | VIEWER | Monthly contract creation counts |

## Audit Logs

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| GET | `/admin/audit` | AUDITOR | Paginated audit log with filters |
| GET | `/admin/audit/summary` | AUDITOR | Action frequency breakdown |
| GET | `/admin/audit/export` | LEGAL_ADMIN | CSV export |

## Counterparties

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| GET | `/counterparties` | VIEWER | List counterparties |
| POST | `/counterparties` | CONTRACT_MANAGER | Create counterparty |
| GET | `/counterparties/:id` | VIEWER | Get counterparty |
| PATCH | `/counterparties/:id` | CONTRACT_MANAGER | Update counterparty |

## AI Providers

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| GET | `/ai/providers` | SUPER_ADMIN | List available providers and status |
| POST | `/ai/providers/test` | SUPER_ADMIN | Test a specific provider |

## Pagination Response Format

All paginated endpoints return:

```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

## Error Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```
