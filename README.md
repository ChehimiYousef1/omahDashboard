# OMAH Connect — Admin Dashboard

OMAH Connect is an internal administration and recruitment platform built with an Express/Node.js backend, MongoDB, and a React + Vite administration frontend.

The repository contains Applicant Management, Talent Pool, interviews, evaluations, documents, analytics, notes/tasks, audit history, reporting, calendar integration, communications, and related administrative workflows.

## Technology

- Node.js 24.x
- npm 11.x
- Express
- MongoDB / Mongoose
- React
- TypeScript
- Vite

Supported runtime versions are defined in `package.json` and `.nvmrc`.

## Project structure

```text
server.js                 Application entry point
src/                      Backend bootstrap and routes
services/                 Business logic and integrations
models/                   MongoDB/Mongoose models
middleware/               Authentication and authorization
config/                   Backend configuration
utils/                    Shared backend utilities
docs/                     Current technical and operational documentation
docs/archive/             Historical documentation only
integrations/             External integration source/configuration
scripts/                  Tests, audits and operational utilities
omahconnect-admin/        React/Vite administration frontend
data/                     Local/legacy runtime data
private-storage/          Local private document storage
```

Runtime data, private documents, environment files and generated build output are intentionally excluded from source control.

## Requirements

Expected runtime family:

```text
Node >=24 <25
npm  >=11 <12
```

With NVM:

```bash
nvm use
```

MongoDB must be available through `MONGODB_URI` for normal application operation.

## Installation

```bash
npm ci
npm ci --prefix omahconnect-admin
cp .env.example .env
cp omahconnect-admin/.env.example omahconnect-admin/.env
```

Never commit populated environment files.

## Local development

Backend:

```bash
npm run dev
```

Default backend port: `5000`.

Frontend:

```bash
npm run dev --prefix omahconnect-admin
```

Default Vite development port: `5173`.

## Production build

```bash
npm run build
```

Production requires an explicit frontend API base URL through `VITE_API_URL`.

Production source maps are disabled.

Start the Node application with:

```bash
NODE_ENV=production npm start
```

The backend can serve the generated frontend from `omahconnect-admin/dist`.

## Validation

Full Applicant regression:

```bash
npm run test:applicant
```

Database migration validation and status:

```bash
npm run migrate:check
npm run migrate:status
```

Apply migrations only during an approved release step:

```bash
npm run migrate
```

Application startup never runs database migrations automatically.

Repository safety:

```bash
git diff --check
git status --short
```

Health endpoints:

```text
GET /health
GET /ready
```

Swagger and Developer APIs are disabled by default in production unless explicitly enabled.

## Documentation

Current production documentation:

- [Documentation index](docs/README.md)
- [Architecture](docs/architecture.md)
- [Environment configuration](docs/environment.md)
- [Deployment](docs/deployment.md)
- [Backup and restore](docs/backup-restore.md)
- [Security](docs/security.md)
- [Operations runbook](docs/runbook.md)

Applicant-specific design documentation remains under `docs/`.

Historical setup material is under `docs/archive/` and must not be treated as the current production procedure.

## Important production rule

Production credentials must be supplied through secure environment/secret management. They must never be committed to Git or embedded in frontend `VITE_*` variables.
