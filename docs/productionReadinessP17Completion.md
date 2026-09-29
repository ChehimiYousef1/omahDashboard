# Production Readiness P17 Completion

**Status:** COMPLETE
**Environment:** Production
**Production hostname:** `dashboard.bildungsgaurd24.de`
**AWS region:** `us-east-1`
**P16 base commit:** `1ae237e93e5b3cb8ab217f71ac037541b41aef95`

## Objective

P17 closes the production monitoring and backup-readiness work after the
production cutover. The phase adds operational alerting, WAF logging,
customer-managed CloudWatch Logs encryption, MongoDB backup automation,
and verifies the existing EFS, S3, and rollback protections.

## Monitoring and alerting

The production environment has five CloudWatch alarms covering:

- ALB HTTP 5xx responses
- target HTTP 5xx responses
- low healthy-host count
- ECS CPU utilization
- ECS memory utilization

Alarm and OK actions target the production SNS alert topic. A production
email subscription was confirmed during the P17 verification. The recipient
address is intentionally not stored in this repository.

Container Insights remains enabled for the production ECS cluster.

## CloudWatch Logs and WAF logging

Production application and WAF logs use 90-day retention.

A dedicated customer-managed AWS KMS key protects both production
CloudWatch log groups. Automatic key rotation is enabled. The key policy
permits the regional CloudWatch Logs service and restricts use through the
CloudWatch Logs encryption context for the intended production log groups.

P17 verified:

- existing application logs remained readable after KMS association
- existing WAF logs remained readable after KMS association
- a new post-association application log event could be written and read back
- the temporary verification log stream was removed afterward

WAF logging is enabled and redacts:

- `Authorization`
- `Cookie`
- query strings

## MongoDB backup automation

A scheduled Fargate MongoDB backup task runs daily using:

- EventBridge schedule: `cron(0 2 * * ? *)`
- Fargate task count: 1
- private subnets
- public IP disabled
- `ReadonlyRootFilesystem: true`
- EFS transit encryption enabled
- EFS IAM authorization enabled

The backup task uses the dedicated EFS access point:

- access point: `fsap-057d265101d641dbf`
- path: `/omah-backups`

The application continues to use its separate access point:

- access point: `fsap-04a5b3275092d870d`
- path: `/omah-data`

The final audit confirmed exactly these two production EFS access points,
with no temporary diagnostic access points remaining.

## Real MongoDB backup verification

P17 executed a real production backup using the deployed scheduled-task
configuration.

Verified evidence:

- ECS task exit code: `0`
- archive size: `2015` bytes
- SHA256:
  `7a3edee47ef974362c261d3cad7c02f5686079b8e9b07ba1c9b614528df57098`
- `mongorestore --dryRun` completed successfully
- backup validation marker was present

This verifies the backup mechanism, persistence path, archive integrity
evidence, and restore dry-run path. It does not by itself assert application
data completeness.

## EFS backup protection

The production EFS automatic backup policy is enabled.

The P17 final audit found two completed EFS recovery points. An explicit
on-demand recovery point was also completed during P17 verification.

## S3 document protection

The production document bucket was verified with:

- versioning enabled
- default AES-256 server-side encryption
- all S3 public-access-block controls enabled

## Rollback protection

The protected legacy production EC2 instance was not modified by P17.

The final audit confirmed that the legacy rollback instance remains running
on its expected network/security group and that rollback snapshot
`snap-086adbd60e9b89119` remains completed and retained.

## Final production verification

P17K completed the consolidated read-only production audit with:

- both CloudFormation stacks `UPDATE_COMPLETE`
- `/health` returning `{"status":"ok"}`
- `/ready` returning `{"status":"ready","database":"connected"}`
- ECS desired/running/pending = `1/1/0`
- ECS rollout `COMPLETED`
- ALB target healthy
- all five production alarms `OK`
- confirmed SNS alert delivery subscription
- KMS key enabled with automatic rotation
- application and WAF log groups associated with the KMS key
- WAF logging/redaction verified
- MongoDB backup schedule and dedicated backup access point verified
- real MongoDB backup evidence verified
- EFS automatic backup enabled
- completed EFS recovery points present
- S3 protections verified
- expected TaskRole inline policies only
- protected legacy rollback infrastructure retained
- deployment artifact regression passed
- `git diff --check` passed

## Operational notes

- The confirmed SNS email endpoint is intentionally managed outside this
  repository; no personal recipient address is committed here.
- The MongoDB backup archive verified during P17 contained the collections
  available in the production MongoDB database at backup time. P17 backup
  verification is a mechanism/integrity check, not a declaration that legacy
  JSON data has been migrated into MongoDB.
- Legacy production data and the legacy EC2 rollback path remain protected
  for rollback while later production-readiness phases continue.
- P18 remains responsible for the final security and functional regression,
  including the deferred Permissions-Policy and ECR security checks.

## P17 result

P17 production monitoring and backup readiness is complete and ready for
checkpointing.
