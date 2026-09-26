# OMAH Connect Documentation

This directory contains the current technical and operational documentation for OMAH Connect.

## Production documentation

| Document | Purpose |
|---|---|
| `architecture.md` | Current system structure, runtime flow and boundaries |
| `environment.md` | Backend/frontend environment configuration |
| `deployment.md` | Production build, deployment and rollback contract |
| `backup-restore.md` | Backup policy and restore-drill requirements |
| `backupRestoreVerification.md` | Latest verified backup/restore drill record |
| `security.md` | Security configuration and production controls |
| `securityAuditP5.md` | P5 local security audit findings and rotation requirements |
| `runbook.md` | Day-to-day operations and incident procedures |
| `migrations.md` | Database migration workflow and safety rules |

## Applicant documentation

Applicant-specific architecture and completion records remain separate:

- `applicantTalentPoolArchitecture.md`
- `applicantTalentPoolCompletion.md`
- Applicant Swagger source files

Applicant remains the source of truth. Talent Pool remains an organizational layer over Applicant rather than a duplicate candidate database.

## Historical documentation

`docs/archive/` contains older setup notes retained for reference.

Those documents may contain obsolete commands, old file paths or development assumptions and must not override the current root README or the production documents listed above.

## Documentation authority

For current operations use this order:

1. root `README.md`
2. production documents in `docs/`
3. integration-specific documentation in `integrations/`
4. historical documentation only when investigating legacy behavior
