# Backup and Restore Verification

## P4 verification

A fresh local backup and isolated restore drill was successfully completed on
`20260925T230441Z`.

### Source

- Database: `omahconnect`
- Collections: 11
- Documents: 361
- Application checkpoint before P4:
  `362d7c5093b2756210cc6fa907e9430a5d65979c`

### MongoDB backup

The verified backup used MongoDB Database Tools:

- `mongodump` archive with gzip compression
- SHA-256:
  `afdff4b3840328a60f1c097a1ef93249cb61e5c302e3e6a423125c2652aa0d12`
- Archive size: 83874 bytes

The backup artifact is stored outside the Git repository under the secure local
backup area. No credentials are recorded in this document.

### Restore validation

The archive was restored into a uniquely named isolated temporary database.

The drill verified:

- exact collection count
- exact document count
- per-collection logical BSON content hashes
- per-collection index-definition hashes
- migration status against the restored database
- source database unchanged before/after the drill
- isolated restore database removed after validation

### Private document storage

- Files included: 5
- Backup archive SHA-256:
  `f5827568257cce8226e8c7090dca8eadf4cc3795f9482baea8f81bb171590702`

The private-storage archive was extracted into an isolated temporary directory
and file SHA-256 manifests were compared.

### Result

**PASS**

This verification demonstrates that the fresh P4 backup was restorable in the
current local environment. Production backup scheduling, retention, remote
durable storage, encryption policy and monitoring remain part of the later
production infrastructure/operations phases.
