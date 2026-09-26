# P5 Local Security Audit

## Result

P5 was a read-only local security audit. It completed with:

- hard failures: **0**
- warnings: **8**
- repository modifications: **none**

No secret values are recorded in this document.

## Confirmed controls

The audit confirmed:

- populated `.env` is not tracked
- `.env` file mode is owner-only (`600`)
- secure backup directories use owner-only directory permissions (`700`)
- JWT secret is present locally and has sufficient length
- `ALLOWED_ORIGINS` contains no wildcard
- Swagger and Developer API production gates exist
- Applicant sync write gate exists
- Calendar, Drive import and interview email feature gates exist
- backend and frontend production `npm audit` reported no vulnerabilities
- Helmet, CORS, JWT verification, bcrypt, upload limits and rate limiting are present
- no `eval`, `new Function`, `shell: true` or `dangerouslySetInnerHTML` was found by the audit
- production support-surface 404 boundaries exist
- important local security headers were present

## Findings carried into P6

P6 addresses these application/local-runtime findings:

1. Local private Applicant storage was too permissive (`755` directories / `644` files).
2. Content-Security-Policy was disabled.
3. Development localhost CORS convenience was also accepted by the production CORS callback.
4. JWT signing/verification did not explicitly restrict the accepted algorithm.
5. Logout did not explicitly use the same cookie scope/options used for authentication.
6. Authentication responses did not explicitly opt out of caching.

The three enabled local integration flags observed by P5 are development choices. The committed environment template keeps write-capable integrations disabled by default.

## Historical secret rotation requirement

Git history contains historical non-empty values for these sensitive keys:

- `JWT_SECRET`
- `MONGODB_URI`
- `SMTP_PASS`

Their values are intentionally not reproduced.

Production must use newly generated/reissued credentials. If a historical MongoDB URI contained credentials, those database credentials must not be reused.

Credential rotation is an operational deployment requirement and is not performed automatically by repository hardening scripts.
