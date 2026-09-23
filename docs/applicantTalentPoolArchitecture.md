# Applicant Talent Pool Architecture

## Purpose

Talent Pool Management retains suitable Applicants for future OMAH
opportunities without creating a duplicate candidate database.

The existing Applicant remains the source of truth for:

- identity
- education
- skills
- professional experience
- position preferences
- recruitment status
- tags
- submissions
- interviews
- evaluations
- documents
- notes/tasks
- communications
- audit history

Talent Pool stores only future-opportunity membership and workflow metadata.

---

## Data Ownership

### Applicant

Existing Applicant fields remain authoritative.

A new `talentPool` subdocument stores:

- active membership state
- category reference
- role classifications
- operational priority
- owner
- membership source
- private membership reason
- added metadata
- last review metadata
- next review date
- removal metadata
- restore metadata

Talent Pool MUST NOT copy Applicant identity, skills, education,
documents, evaluations, interviews, or tags.

### TalentPoolCategory

Categories are configurable records rather than hard-coded Applicant
properties.

A category stores:

- name
- slug
- description
- active state
- sort order
- creation metadata
- update metadata
- archive metadata
- timestamps

---

## Initial Categories

1. Strong Candidate
2. Future Opportunity
3. Internship Candidate
4. Junior Talent
5. Experienced Talent
6. Specialist
7. Freelance / Project-Based
8. Not Available Now
9. Reconsider Later

These are seed/default definitions. Category CRUD remains authoritative.

---

## Membership CRUD Contract

### GET all

`GET /api/applicants/talent-pool`

Returns paginated Talent Pool membership results with server-side
search, filters and sorting.

### GET by Applicant ID

`GET /api/applicants/talent-pool/:applicantId`

Returns one Applicant together with safe Talent Pool membership data.

### POST add

`POST /api/applicants/talent-pool/:applicantId`

Adds an existing Applicant to the Talent Pool.

### PUT full update

`PUT /api/applicants/talent-pool/:applicantId`

Replaces the complete editable Talent Pool configuration.

### PATCH partial update

`PATCH /api/applicants/talent-pool/:applicantId`

Updates selected Talent Pool fields only.

### DELETE soft remove

`DELETE /api/applicants/talent-pool/:applicantId`

Removes Talent Pool membership without deleting the Applicant.

### Restore

`POST /api/applicants/talent-pool/:applicantId/restore`

Restores previously removed Talent Pool membership.

---

## Category CRUD Contract

- `GET /api/applicants/talent-pool/categories`
- `GET /api/applicants/talent-pool/categories/:categoryId`
- `POST /api/applicants/talent-pool/categories`
- `PUT /api/applicants/talent-pool/categories/:categoryId`
- `PATCH /api/applicants/talent-pool/categories/:categoryId`
- `DELETE /api/applicants/talent-pool/categories/:categoryId`
- `POST /api/applicants/talent-pool/categories/:categoryId/restore`

DELETE means category archival, never physical deletion.

---

## Static Route Ordering

Static endpoints MUST be registered before membership
`/:applicantId` routes.

Examples:

- `/categories`
- `/options`
- `/analytics`

must never be interpreted as Applicant IDs.

The Talent Pool router will be mounted separately at:

`/api/applicants/talent-pool`

before the general Applicant router.

---

## Review / Revisit Workflow

Stored fields:

- `lastReviewedAt`
- `lastReviewedBy`
- `nextReviewAt`

Review state is derived by the server rather than permanently stored.

Possible derived states:

- `inactive`
- `not_scheduled`
- `scheduled`
- `due`
- `overdue`
- `reviewed`

This prevents stale stored status values as time passes.

---

## Tags

Talent Pool reuses:

`Applicant.recruitment.tags`

No second Talent Pool tag collection is created.

---

## Tasks and Calendar

Talent Pool follow-ups will reuse Applicant Notes / Tasks.

External Calendar synchronization remains an explicit user action.
Scheduling a Talent Pool revisit must never silently write to
Google Calendar.

---

## Deletion Safety

Talent Pool DELETE never deletes an Applicant.

Applicant permanent deletion remains governed exclusively by the
existing archived-Applicant permanent-delete workflow.

---

## Privacy

Talent Pool API responses and Audit events must not expose:

- normalized email
- normalized phone
- LinkedIn canonical values
- document storage keys
- document checksums
- signed URLs
- meeting/provider internals
- private Evaluation free text
- private Interview notes
- authentication information

Private Talent Pool reason text must not be copied into Audit history.
Audit may record only safe metadata such as `reasonProvided`.

---

## HTTP Contract

- 200 OK
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 500 Internal Server Error

---

## Delivery Sequence

- B5A Architecture + categories
- B5B Data model + service foundation
- B5C Category CRUD
- B5D Membership CRUD + search/filter/sort/pagination
- B5E Revisit workflow + Notes/Tasks/Calendar integration
- B5F Talent Pool frontend dashboard
- B5G Applicant Profile integration
- B5H Audit & History integration
- B5I Swagger + API contracts
- B5J Real DB/browser validation + final regression
- B5K Commit/tag/push/final closure
