# Mithaqyn — Enterprise Contract Intelligence Platform

> This project was built as Mithaqyn, an enterprise Contract Intelligence Platform supporting multiple major LLM providers and OpenAI-compatible APIs.

Mithaqyn is an enterprise-grade contract intelligence platform for storing, analyzing, comparing, and monitoring contracts, amendments, procurement agreements, and vendor agreements.

## Features

- **Contract Repository** — Store, organize, and search contracts with rich metadata
- **Document Ingestion** — OCR-ready document upload with multi-format support
- **Clause Extraction** — AI-powered extraction of 20+ clause categories
- **Contract Summarization** — Instant AI-generated summaries
- **Risk Scoring** — Multi-dimensional risk analysis with severity levels
- **Obligation Tracking** — Track, assign, and monitor contractual obligations
- **Renewal Prediction** — Proactive renewal and expiry management
- **Contract Comparison** — Side-by-side clause and version comparison
- **Version Management** — Full document version history
- **Multi-LLM Support** — 11+ AI providers including any OpenAI-compatible endpoint
- **Admin Dashboard** — Executive KPI dashboard with charts
- **Audit Logs** — Comprehensive action tracking for compliance
- **Role-Based Access Control** — 6 role levels from Viewer to Super Admin

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, ShadCN UI |
| Backend | NestJS, TypeScript, REST API |
| Database | PostgreSQL 16, Prisma ORM |
| AI | Multi-provider abstraction (OpenAI, Azure, Anthropic, Gemini, Mistral, Cohere, Groq, Together, DeepSeek, Ollama, OpenAI-compatible) |
| Auth | JWT, RBAC |
| Storage | Local FS / S3-compatible |
| Cache | Redis |
| Containers | Docker, Docker Compose |

## Quick Start

### Prerequisites

- Node.js 20+
- Yarn
- Docker and Docker Compose

### 1. Clone and install

```bash
git clone <repo-url>
cd mithaqyn
yarn install
```

### 2. Environment setup

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Edit `apps/api/.env` with your configuration — at minimum set `DATABASE_URL`, `JWT_SECRET`, and one AI provider key.

### 3. Start the database

```bash
docker compose up -d
```

### 4. Run database migrations

```bash
cd apps/api
npx prisma migrate dev
npx prisma db seed
```

### 5. Start development servers

```bash
# From root
yarn dev
```

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API | http://localhost:3001 |
| API Docs | http://localhost:3001/api/docs |

## AI Provider Configuration

Mithaqyn supports 11 AI providers. Configure in `apps/api/.env`:

### OpenAI

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

### Anthropic Claude

```env
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

### OpenAI-Compatible Endpoint

Works with Ollama, LM Studio, vLLM, OpenRouter, LiteLLM, Fireworks, Together AI, and any local enterprise gateway.

```env
OPENAI_COMPAT_BASE_URL=http://localhost:11434/v1
OPENAI_COMPAT_API_KEY=ollama
OPENAI_COMPAT_MODEL=llama3.1
```

See [docs/ai-providers.md](docs/ai-providers.md) for full provider configuration reference.

## RBAC Roles

| Role | Description |
|------|-------------|
| Super Admin | Full platform access, user management, provider config |
| Legal Admin | All contract operations, team management |
| Contract Manager | CRUD contracts, trigger AI analysis |
| Reviewer | Review clauses, annotate risks |
| Auditor | Read-only access to all data including audit logs |
| Viewer | Read-only access to assigned contracts |

## Project Structure

```
mithaqyn/
├── apps/
│   ├── api/          # NestJS backend (port 3001)
│   └── web/          # Next.js frontend (port 3000)
├── packages/
│   └── shared/       # Shared TypeScript types
├── docs/             # Architecture and guides
├── docker/           # Docker init scripts
└── docker-compose.yml
```

## API Documentation

Interactive Swagger UI at `http://localhost:3001/api/docs`.

See [docs/api.md](docs/api.md) for the full endpoint reference.

## Screenshots

> Screenshots will be added as the UI is finalized.

## Roadmap

- [ ] Multi-language contract support
- [ ] E-signature integration
- [ ] Contract negotiation workflow
- [ ] SSO / LDAP integration
- [ ] Webhook notifications
- [ ] Mobile application
- [ ] Contract templates library
- [ ] Bulk import

## Security

- JWT authentication with configurable expiry
- API keys encrypted at rest (AES-256)
- RBAC on all protected routes
- Rate limiting via NestJS Throttler
- File upload type and size validation
- Audit log for all sensitive actions
- Helmet.js security headers

See [docs/security.md](docs/security.md) for the full security guide.

## License

Copyright © 2024 Mithaqyn. All rights reserved.
