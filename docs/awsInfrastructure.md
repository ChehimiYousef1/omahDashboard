# AWS Infrastructure as Code

## P11B boundary

P11B defines and validates deployment infrastructure. It **does not create AWS
resources**.

No `cloudformation deploy`, stack creation, ECR push, DNS change, certificate
request, or application deployment occurs in this phase.

The templates are:

```text
infrastructure/cloudformation/foundation.yml
infrastructure/cloudformation/service.yml
```

Environment examples are:

```text
infrastructure/parameters/staging.example.json
infrastructure/parameters/production.example.json
```

## Foundation stack

The foundation template defines:

- VPC across two Availability Zones
- two public ALB subnets
- two private ECS/EFS subnets
- optional NAT Gateway
- S3 gateway endpoint
- private interface endpoints for ECR API, ECR Docker, CloudWatch Logs, and Secrets Manager
- private ECS security group
- ECR repository with immutable tags and scan-on-push
- ECS Fargate cluster
- public Application Load Balancer
- regional AWS WAFv2 Web ACL
- private S3 Applicant-document bucket
- encrypted/versioned S3 storage with public access blocked
- encrypted EFS with backups for transitional legacy JSON persistence
- EFS access point using application UID/GID `10001`
- CloudWatch application log group
- ECS execution/task IAM roles

## Network egress decision

`EnableNatGateway=false` is the safe/cost-conscious default in the examples.

With NAT disabled, private tasks can still use the AWS services covered by VPC
endpoints. They **cannot** reach arbitrary public Internet endpoints.

Enable NAT only when required, for example:

- MongoDB Atlas is reached through its public endpoint,
- SMTP is enabled,
- Google Calendar/Drive is enabled,
- WhatsApp Cloud is enabled,
- another required external API is enabled.

If MongoDB Atlas PrivateLink is selected and all required services are
privately reachable, NAT may remain disabled.

A NAT Gateway, ALB, WAF, Fargate, EFS, interface endpoints, CloudWatch, S3,
ECR, and other AWS services can all produce ongoing charges. Before a real
stack is created, P12/P16 must show the exact resource plan and obtain explicit
approval to provision cost-bearing resources.

## HTTP / HTTPS staging boundary

P11B deliberately does not configure ACM or the final HTTPS listener.

The foundation listener on port 80 defaults to a fixed `404`.

The service template associates its target group with that listener **only for
`/health` and `/ready`**. The application UI and authenticated API are therefore
not forwarded over temporary HTTP.

The later domain/TLS phase must:

1. request/validate the ACM certificate,
2. create the HTTPS listener,
3. forward the application through HTTPS,
4. change HTTP to HTTPS redirect,
5. validate secure-cookie login and CORS using the final HTTPS origin.

No credentials should be entered through a temporary HTTP endpoint.

## Secrets Manager contract

The service template does not contain secret values.

It expects one Secrets Manager JSON secret under the naming boundary:

```text
omah-dashboard/<environment>/...
```

The initial required JSON keys are:

```text
MONGODB_URI
JWT_SECRET
```

Additional integration secrets are added only when their corresponding feature
gates are intentionally enabled.

Never pass secret values in CloudFormation parameter files or commit them to
Git.

## Document storage

Applicant documents use the foundation S3 bucket:

```text
DOCUMENT_STORAGE_PROVIDER=s3
DOCUMENT_S3_BUCKET=<foundation output>
DOCUMENT_S3_FORCE_PATH_STYLE=false
AWS_REGION=<stack region>
```

The application task role receives only the required bucket/object operations.

## Legacy JSON persistence

The existing `db.js` routes still use JSON stores. Fargate task-local storage
would lose that state when a task is replaced.

Until those stores are migrated, the service mounts the encrypted EFS access
point at `/app/data`.

Before staging is considered functionally ready, P12 must initialize the
staging EFS data area from an approved staging dataset. Production data is not
copied automatically by these templates.

## Deployment order later

The intended deployment order is:

```text
1. authenticate AWS CLI and verify identity/region
2. review cost-bearing resources
3. deploy foundation stack
4. create the application Secrets Manager secret securely
5. initialize staging legacy-data EFS from approved staging data
6. build image from the checkpoint commit
7. tag image with Git SHA
8. push image to ECR
9. deploy service stack
10. verify target health /health and /ready
11. complete domain + ACM + HTTPS
12. run browser/security/regression checks
```

P11B stops before step 3.
