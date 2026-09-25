# Backup and Restore

## Objective

A backup is only considered operationally useful after a restore has been successfully tested.

## Current helper

```bash
npm run backup
```

This invokes the existing Mongo backup helper.

It is not proof of recoverability until the P4 backup/restore drill has been completed.

## Production backup scope

A complete production backup strategy must consider:

- MongoDB application data
- private Applicant documents
- production configuration references
- integration configuration metadata
- deployment version/checkpoint information

Secrets should be backed up through the production secret-management system rather than repository backup directories.

## Repository restrictions

Backup artifacts must not be committed.

Ignored runtime/backup paths include:

```text
/backup-mongo/
/data-backup-*/
/data/
/private-storage/
```

## Fresh backup procedure

1. identify source database
2. create a fresh timestamped backup
3. store it outside Git
4. protect backup permissions
5. record the application commit
6. verify the artifact exists and is readable
7. copy it to durable backup storage according to retention policy

## Restore drill

P4 must restore into a safe non-production target and verify:

```text
backup can be read
database can be restored
application can connect
expected collection/data counts are reasonable
critical Applicant records are queryable
production is not overwritten
```

Record backup timestamp, source database, restore target, application commit, restore duration, validation performed, and result.

## Restore safety

Never restore over active production without an approved recovery decision, confirmation of backup and target, a fresh pre-restore snapshot where possible, and a traffic/downtime plan.

## Private documents

Local `private-storage/` is not sufficient as a long-term production backup strategy.

Production object storage backup/versioning/retention must be included in the final recovery plan.

## Status

Documentation is complete in P2. A fresh verified backup plus successful restore test remains a separate P4 requirement.

## Verified drill record

The latest repository-recorded restore verification is documented in:

```text
docs/backupRestoreVerification.md
```

The verification record contains no database credentials.
