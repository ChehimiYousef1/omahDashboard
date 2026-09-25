# OMAH Connect Operations Runbook

## Identify deployed version

```bash
git rev-parse HEAD
git log -1 --oneline --decorate
```

## Install

```bash
npm ci
npm ci --prefix omahconnect-admin
```

## Build

```bash
npm run build
```

Expected generated directory:

```text
omahconnect-admin/dist
```

## Start

Development:

```bash
npm run dev
```

Production:

```bash
NODE_ENV=production npm start
```

## Health checks

```text
GET /health
GET /ready
```

Expected: HTTP 200 for both during normal operation.

Do not route normal traffic to an instance that is not ready.

## Support-surface check

Expected normal production behavior:

```text
/api-docs -> 404
/api/dev  -> 404
```

If either is intentionally enabled, confirm authentication/authorization and document the reason.

## Applicant regression

```bash
npm run test:applicant
```

A failed regression blocks release until investigated.

## Repository safety

```bash
git status --short
git diff --check
```

Generated frontend output should not be committed.

## MongoDB incident

If `/health` works but `/ready` reports database failure:

1. confirm `MONGODB_URI`
2. verify network reachability
3. verify credentials/permissions
4. verify database service status
5. inspect backend logs
6. do not switch production to an unverified local fallback merely to make readiness green

## Email incident

Set:

```text
INTERVIEW_EMAIL_ENABLED=false
```

until SMTP and recipient behavior are verified.

## Calendar incident

Set:

```text
GOOGLE_CALENDAR_WRITE_ENABLED=false
```

until production OAuth and update semantics are verified.

## Applicant sync incident

Set:

```text
APPLICANT_SYNC_WRITE_ENABLED=false
```

if source integrity is uncertain.

## Swagger / developer incident

Set:

```text
SWAGGER_ENABLED=false
DEV_API_ENABLED=false
```

and verify 404 responses after restart/redeploy.

## Rollback

Use the last known-good checkpoint.

1. identify failing version
2. identify previous verified tag
3. preserve logs/evidence
4. redeploy previous application version
5. do not automatically downgrade MongoDB
6. verify `/health`
7. verify `/ready`
8. run smoke tests
9. record the rollback

## Backup incident

Preserve current state, identify the newest verified backup, do not overwrite production until target and artifact are confirmed, and follow `docs/backup-restore.md`.

## Release smoke test

```text
Login
Applicants
Applicant Profile
Talent Pool
Audit & History
Notes / Tasks
Calendar
Interviews
Evaluations
Duplicate Review
Documents
Analytics
```

## Incident record

Capture timestamp, deployed commit, environment, affected feature, HTTP/status symptoms, sanitized logs, database readiness, recent deployment/configuration changes, actions taken and result.

Never copy credentials or tokens into incident notes.
