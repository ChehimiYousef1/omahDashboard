# Production Security

## Security model

OMAH Connect uses layered controls across authentication, authorization, environment secrets, CORS, support-surface restrictions, document access, integration feature gates, audit history, and repository hygiene.

## Secrets

Never commit:

```text
.env
MongoDB credentials
JWT secrets
SMTP passwords
Google client secrets
Google refresh tokens
webhook secrets
private keys
```

`.env.example` contains names/default-safe values only.

Historical credentials that may previously have existed in Git history must be treated as exposed and rotated before production use.

## Frontend configuration

All `VITE_*` values are visible to frontend users. Only non-secret public configuration belongs there.

Current production frontend configuration requires `VITE_API_URL`.

## Production support surfaces

```text
SWAGGER_ENABLED=false
DEV_API_ENABLED=false
```

When disabled:

```text
/api-docs -> 404
/api/dev  -> 404
```

## CORS

Production `ALLOWED_ORIGINS` must contain only intended HTTPS frontend origins.

Do not use an unrestricted wildcard with credentialed traffic.

## Authentication and authorization

Authentication remains server-side.

Applicant routes use Applicant-specific authorization and permission checks rather than a blanket Admin-only gate for all Applicant operations.

Privileged operations can still require elevated permissions where appropriate.

## Applicant documents

Applicant documents require authenticated access, authorization checks, upload validation, private storage, safe view/download behavior and auditable lifecycle operations.

## Integration safety

Write-capable integrations are separately gated:

```text
APPLICANT_SYNC_WRITE_ENABLED
GOOGLE_CALENDAR_WRITE_ENABLED
GOOGLE_DRIVE_DOCUMENT_IMPORT_ENABLED
INTERVIEW_EMAIL_ENABLED
```

Do not enable a write feature merely because its read integration works.

## Production build

Production frontend requirements include explicit `VITE_API_URL`, disabled source maps, and no localhost backend URL embedded in the bundle.

## Repository hygiene

The repository ignores environment files, dependencies, generated builds, logs, local backups, runtime data, private document storage, and temporary files.

## Later security phases

P2 documents the security contract. Later phases still require active verification of dependency vulnerabilities, Git secret history, auth/authz, CORS, cookies/tokens, request validation, injection, XSS, CSRF exposure, uploads, rate limits, abuse controls, bot/crawler behavior, scraping deterrence, TLS, production exposure, cloud permissions, logging and monitoring.

## P5/P6 verified hardening

The P5 local audit is recorded in `securityAuditP5.md`.

P6 adds the following application boundaries:

- production Content-Security-Policy through Helmet
- production CORS/Origin allowlisting with HTTPS-only configured browser origins
- localhost browser origins only in development
- `X-Powered-By` disabled
- explicit `HS256` JWT signing and verification
- production JWT secret minimum length
- authentication responses marked `no-store`
- consistent authentication cookie scope on set/clear
- local private document directories created as `0700`
- local private document files created as `0600`
- public signup disabled by default in the environment template

The current local integration flags may be enabled for controlled development. Production configuration must start write-capable integrations disabled and enable each one only after its credentials, permissions and target resources are verified.

Historical non-empty `JWT_SECRET`, `MONGODB_URI` and `SMTP_PASS` values detected by P5 must not be reused for production.

## P7 rate limiting and abuse controls

P7 adds layered in-process abuse protection using `express-rate-limit`.

The controls include:

- failed-login throttling
- signup throttling when signup is explicitly enabled
- a generous global API burst ceiling
- a separate mutation ceiling
- stricter limits for bulk campaigns and outbound communications
- limits for calls and external-service actions
- limits for Google Sheet synchronization
- limits for Applicant document mutations
- limits for PDF/report generation
- limits for Calendar/Interview external actions
- a stricter destructive-action ceiling
- the existing Applicant Form webhook limiter remains active

All rate-limit responses use HTTP `429` and a generic `RATE_LIMITED` response without exposing internal identifiers.

These application-level limiters use the default in-memory store and therefore protect one Node.js process. They are not a replacement for edge/distributed controls. Before horizontal production scaling, enforce a second layer through AWS WAF/CloudFront (or an equivalent trusted edge) and use a shared limiter store if application-level counters must span multiple instances.

P7 also closes a post-P6 verification gap: signup/login/logout now actually use the shared hardened authentication-cookie policy that P6 introduced.

Outbound campaign email is fail-closed in production when SMTP credentials are absent, and SMTP provider error text is not returned directly to API clients.

## P8 bot and AI crawler controls

OMAHCONNECT is a private administrative application and is not intended for public search discovery.

P8 adds defense in depth:

- `robots.txt` denies crawling across the entire frontend
- the SPA HTML includes `noindex`, `nofollow`, `noarchive`, `nosnippet`, and `noimageindex`
- application responses include the equivalent `X-Robots-Tag`
- production rejects known search and AI crawler User-Agent identities
- `robots.txt` itself remains reachable so compliant crawlers can read the deny policy
- production source maps remain disabled

The runtime block includes known crawler identities from OpenAI, Anthropic, Common Crawl, major search engines, and several other automated indexing services.

These controls are deterrence, not an authentication boundary. `robots.txt` is advisory and User-Agent strings can be spoofed. Authentication and authorization remain the protection for private application data. P9 adds scraping deterrence, and the AWS production phases must add edge/WAF bot controls where appropriate.
