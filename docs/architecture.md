# Mithaqyn — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│              Next.js 14 (apps/web) — Port 3000              │
│  Dashboard | Contracts | Clauses | Risks | Obligations       │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API (JSON)
┌─────────────────────▼───────────────────────────────────────┐
│                      API Layer                               │
│              NestJS (apps/api) — Port 3001                   │
│  Auth | Contracts | AI | Clauses | Risks | Obligations       │
│  Renewals | Comparison | Audit | Users                       │
└──────┬──────────────┬──────────────┬───────────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼──────────────────────┐
│  PostgreSQL │ │   Redis   │ │      AI Provider Layer      │
│  (Prisma)  │ │  (Cache)  │ │  OpenAI | Anthropic | ...   │
└─────────────┘ └───────────┘ └────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│                    Storage Layer                              │
│              Local FS (dev) / S3-compatible (prod)           │
└─────────────────────────────────────────────────────────────┘
```

## Monorepo Layout

```
mithaqyn/
├── apps/
│   ├── api/                   # NestJS REST API
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/       # JWT + RBAC
│   │   │   │   ├── users/      # User management
│   │   │   │   ├── contracts/  # Contract CRUD
│   │   │   │   ├── documents/  # File upload + storage
│   │   │   │   ├── ai/         # Provider abstraction
│   │   │   │   ├── clauses/    # Clause extraction
│   │   │   │   ├── risks/      # Risk scoring
│   │   │   │   ├── obligations/ # Obligation tracking
│   │   │   │   ├── renewals/   # Renewal management
│   │   │   │   ├── comparison/ # Contract comparison
│   │   │   │   └── audit/      # Audit logging
│   │   │   ├── common/         # Guards, decorators, pipes
│   │   │   ├── prisma/         # Prisma service
│   │   │   └── main.ts
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       ├── migrations/
│   │       └── seed.ts
│   └── web/                   # Next.js 14 App Router
│       └── src/
│           ├── app/            # Route pages
│           ├── components/     # UI components
│           │   ├── ui/         # ShadCN primitives
│           │   ├── layout/     # Sidebar, header
│           │   └── contracts/  # Domain components
│           ├── lib/            # API client, utils
│           ├── hooks/          # React hooks
│           └── store/          # Zustand stores
└── packages/
    └── shared/                 # Shared TypeScript types
```

## AI Provider Abstraction

```
IAIProvider (interface)
  generateText(prompt, options) → Promise<string>
  generateJson<T>(prompt, schema, options) → Promise<T>
  generateEmbeddings(texts) → Promise<number[][]>
  streamText(prompt, options) → AsyncIterable<string>
  validateConfig() → boolean
  getProviderName() → AIProviderName
  getModelList() → string[]

Implementations:
  OpenAIProvider
  AzureOpenAIProvider
  AnthropicProvider
  GeminiProvider
  MistralProvider
  CohereProvider
  GroqProvider
  TogetherProvider
  DeepSeekProvider
  OllamaProvider
  OpenAICompatibleProvider   ← any baseUrl + apiKey combo
```

## Database Entities

```
User ──── Role ──── Permission
 │
 ├── Contract ──── Counterparty
 │      │
 │      ├── ContractDocument
 │      ├── ContractVersion
 │      ├── Clause
 │      ├── RiskFinding
 │      ├── Obligation ──── Reminder
 │      ├── RenewalEvent
 │      └── AIAnalysisJob ──── AIProviderConfig
 │
 └── AuditLog
```

## Security

- JWT tokens (access + refresh) with configurable expiry
- RBAC middleware applied at route level via NestJS Guards
- API provider keys encrypted at rest with AES-256-GCM
- File upload: type whitelist (PDF, DOCX, TXT), size limit, filename sanitization
- Rate limiting: 100 req/min default, configurable per route
- Helmet.js security headers on all responses
- Audit log captures: login, logout, contract view/edit/delete, AI analysis triggers, role changes

## Brand Colors

| Token | Hex |
|-------|-----|
| Primary Navy | `#1B2A4A` |
| Deep Navy | `#14213A` |
| Slate Navy | `#2C3E5C` |
| Gold | `#C5A55A` |
| Background | `#F7F5F0` |
| Text | `#3A3A3A` |
