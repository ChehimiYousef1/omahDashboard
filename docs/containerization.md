# Production Containerization

## Purpose

P11B packages OMAH Connect as one production container:

- React/Vite is built in a dedicated frontend stage.
- Node/Express serves the compiled SPA and `/api/*`.
- Only production backend dependencies are copied to the runtime image.
- The runtime process is non-root (`UID 10001`).
- `/health` is the container liveness endpoint.
- `/ready` remains the traffic-readiness endpoint because it confirms MongoDB connectivity.

The first AWS deployment remains single-origin. The container build uses
`VITE_API_URL=/api` by default so the same immutable image can be promoted
between staging and production domains without rebuilding for a hostname.

## Build-context boundary

`.dockerignore` intentionally excludes:

- `.git/`
- all `node_modules/`
- all `.env*`
- frontend `dist/`
- `data/`
- `private-storage/`
- local backups, dumps, logs, and editor artifacts

The repository is currently large primarily because of local Git history and
dependency directories. None of that belongs in the image build context.

## Runtime data boundary

The image intentionally contains **no current files from `data/`**.

The existing application still has legacy JSON-backed runtime stores for areas
such as users, companies, jobs, emails, calls, notifications, messages,
reports, and settings. ECS/Fargate task filesystems are not a safe persistence
layer for that state.

Therefore the AWS design adds a **transitional encrypted EFS access point**
mounted only at:

```text
/app/data
```

This keeps existing JSON-backed features persistent across task replacement
without placing their live data inside an image.

This EFS layer is compatibility infrastructure, not the long-term data model.
A later migration of the remaining JSON stores to MongoDB or another durable
service should remove the EFS dependency.

Applicant managed documents are **not** stored on EFS. Production Applicant
documents remain in the dedicated private/versioned S3 bucket.

## Writable filesystem

The ECS task definition uses a read-only root filesystem.

Only these locations are writable:

- `/app/data` — encrypted EFS, legacy JSON compatibility
- `/tmp` — task-local ephemeral scratch space

Production document writes use S3.

## Local validation

Run:

```bash
npm run test:deployment-artifacts
npm run docker:smoke
```

The Docker smoke test:

1. builds the production image,
2. verifies `.env`, real `data/`, and `private-storage/` are absent,
3. copies local JSON data to an isolated temporary directory,
4. uses an isolated local MongoDB database,
5. runs the container with a read-only root filesystem,
6. validates `/health`, `/ready`, SPA delivery, CSP, and production support-route guards,
7. removes the temporary container/data and drops the temporary MongoDB database.

The source `data/` directory is never mounted into the container and cannot be
modified by this test.

## Release image

Deployment images should be tagged with the exact Git commit SHA and pushed to
the environment ECR repository only after the release gates pass.

Do not use mutable `latest` as the production release identity.
