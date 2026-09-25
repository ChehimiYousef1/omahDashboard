# OMAH Connect Architecture

## Purpose

OMAH Connect is an internal administration platform with a Node.js/Express backend and React/Vite frontend.

The current architecture intentionally remains a single repository and does not require a large structural refactor before deployment.

## Runtime components

### Backend

Entry point:

```text
server.js
```

Main responsibilities are delegated into:

```text
src/bootstrap/
src/routes/
services/
models/
middleware/
config/
utils/
```

`server.js` assembles the application rather than holding business logic.

### Frontend

The administration frontend is located at:

```text
omahconnect-admin/
```

Technology:

```text
React
TypeScript
Vite
```

Production output:

```text
omahconnect-admin/dist/
```

The generated `dist` directory is not source-controlled.

## Request flow

```text
Browser
   |
   v
Frontend
   |
   v
Express API
   |
   +--> Authentication / Authorization
   |
   +--> Applicant / Admin routes
   |
   +--> Business services
   |
   +--> MongoDB
   |
   +--> Email / Google / document integrations
```

## Server route order

The production server follows this logical sequence:

1. middleware and security configuration
2. static frontend registration
3. API routes
4. health/readiness routes
5. disabled support-surface 404 boundaries
6. React SPA fallback
7. server lifecycle

The explicit support-surface boundary prevents disabled `/api-docs` and `/api/dev` requests from falling through to the frontend SPA.

## Applicant domain

Applicant is the master recruitment identity.

Applicant data relates to submissions, interviews, evaluations, documents, notes/tasks, audit events, reports, and Talent Pool membership.

Talent Pool does not create a second candidate identity database. It organizes existing Applicants for future opportunities.

## Data persistence

MongoDB is the primary application database and is configured through `MONGODB_URI`.

`DISABLE_MONGO` exists for local/legacy behavior and should not be used as the normal production database mode.

Local runtime paths:

```text
/data/
/private-storage/
```

These locations are excluded from Git.

`private-storage` can support local private-document development. Production document persistence must use durable private storage selected during the infrastructure/deployment phases.

## External integrations

Current integration categories include Google Calendar, Google Drive document import, Google Apps Script / Forms, SMTP email, and WhatsApp contact metadata.

Write-capable integrations are feature-gated.

The Google Apps Script source is maintained under:

```text
integrations/google-apps-script/
```

and is deployed independently of the Node application.

## Support surfaces

Swagger is disabled by default in production:

```text
SWAGGER_ENABLED=false
```

Developer APIs are disabled by default in production:

```text
DEV_API_ENABLED=false
```

Disabled `/api-docs` and `/api/dev` requests return 404.

## Health model

```text
/health
/ready
```

`/health` verifies the process responds.

`/ready` verifies readiness conditions such as database connectivity.

## Deployment boundary

AWS service selection, networking, DNS, persistent production storage and deployment automation are finalized in later production-readiness phases.
