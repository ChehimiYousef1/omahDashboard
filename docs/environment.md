# Environment Configuration

## Rules

Environment files containing real credentials are runtime configuration and must never be committed.

Templates:

```text
.env.example
omahconnect-admin/.env.example
```

Production secrets belong in the selected production secret-management mechanism.

Frontend variables beginning with `VITE_` are public build-time values and must never contain secrets.

## Core backend

- `NODE_ENV`: runtime environment.
- `PORT`: Node HTTP listening port.
- `MONGODB_URI`: MongoDB connection string; secret.
- `DISABLE_MONGO`: legacy/local database mode control.
- `JWT_SECRET`: authentication signing secret; highly sensitive.
- `ALLOWED_ORIGINS`: approved browser origins for CORS.
- `ALLOW_SIGNUP`: public signup gate; production/default should remain `false`.

## Applicant ingestion

- `APPLICANT_SHEET_CSV_URL`
- `APPLICANT_FORM_SOURCE_KEY`
- `APPLICANT_FORM_WEBHOOK_SECRET`
- `APPLICANT_AUTO_SYNC_ENABLED`
- `APPLICANT_SYNC_WRITE_ENABLED`

## Google integration

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CALENDAR_ENABLED`
- `GOOGLE_CALENDAR_WRITE_ENABLED`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_CALENDAR_SEND_UPDATES`
- `GOOGLE_DRIVE_DOCUMENT_IMPORT_ENABLED`

OAuth secrets and refresh tokens must be stored only in backend secret configuration.

## SMTP

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`

## Interview notifications

- `INTERVIEW_EMAIL_ENABLED`
- `INTERVIEW_NOTIFICATION_COMPANY_EMAIL`
- `INTERVIEW_NOTIFICATION_COMPANY_NAME`
- `INTERVIEW_EMAIL_FROM`
- `INTERVIEW_EMAIL_FROM_NAME`

## Other application configuration

- `COMPANY_WHATSAPP_NUMBER`
- `TEST_APPLICANT_EMAIL`

## Applicant document storage

- `DOCUMENT_STORAGE_PROVIDER`: explicit production provider (`local`, `external`, or `s3` as supported by the storage factory).
- `DOCUMENT_LOCAL_STORAGE_DIR`: local private storage path for development/local deployments.
- `DOCUMENT_S3_BUCKET`: private S3 bucket for managed Applicant documents.
- `AWS_REGION`: AWS region used by the S3 adapter.
- `DOCUMENT_S3_ENDPOINT`: optional custom S3-compatible endpoint.
- `DOCUMENT_S3_FORCE_PATH_STYLE`: optional S3 path-style compatibility flag.

Production on AWS should prefer IAM roles rather than static AWS access keys in environment files.

## Support surfaces

- `SWAGGER_ENABLED`: production default is `false`.
- `DEV_API_ENABLED`: production default is `false`.

## Frontend

- `VITE_API_URL`: explicit production API base URL.

Example shape:

```text
https://<production-host>/api
```

Do not put secrets in any `VITE_*` variable.

## Production checklist

```text
NODE_ENV=production
MONGODB_URI configured
JWT_SECRET rotated/configured
ALLOWED_ORIGINS restricted
SWAGGER_ENABLED=false
DEV_API_ENABLED=false
VITE_API_URL configured
```

Write-capable integrations should remain disabled until their production credentials and behavior have been individually validated.
