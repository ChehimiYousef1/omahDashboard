import type {
  ReactNode,
} from "react";

import type {
  ApplicantFormSubmission,
  ApplicantMaster,
} from "../../services/api";


interface ApplicantCurrentProfileViewProps {
  applicant: ApplicantMaster;

  submissions:
    ApplicantFormSubmission[];

  loadingSubmissions: boolean;

  onViewAllDocuments: () => void;
}


function displayValue(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.length > 0
      ? value.join(", ")
      : "—";
  }

  if (
    typeof value === "boolean"
  ) {
    return value
      ? "Yes"
      : "No";
  }

  return String(value);
}


function displayDate(
  value:
    | string
    | null
    | undefined
): string {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString();
}


function displayDateTime(
  value:
    | string
    | null
    | undefined
): string {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}


function isSafeUrl(
  value: unknown
): value is string {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    return false;
  }

  try {
    const url =
      new URL(value);

    return (
      url.protocol ===
        "https:" ||
      (
        url.protocol ===
          "http:" &&
        (
          url.hostname ===
            "localhost" ||
          url.hostname ===
            "127.0.0.1"
        )
      )
    );
  } catch {
    return false;
  }
}


function documentValues(
  value:
    | string
    | string[]
    | undefined
): string[] {
  if (
    Array.isArray(value)
  ) {
    return value.filter(
      isSafeUrl
    );
  }

  return isSafeUrl(value)
    ? [value]
    : [];
}


function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">
          {title}
        </h4>

        {description && (
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            {description}
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}


function Field({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: unknown;
  wide?: boolean;
}) {
  return (
    <div
      className={
        wide
          ? "sm:col-span-2 lg:col-span-3"
          : ""
      }
    >
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>

      <span className="mt-1 block whitespace-pre-wrap break-words text-xs font-semibold text-slate-800">
        {displayValue(value)}
      </span>
    </div>
  );
}


function MetadataCard({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>

      <span className="mt-1 block break-words text-xs font-bold text-slate-800">
        {displayValue(value)}
      </span>
    </div>
  );
}


export function ApplicantCurrentProfileView({
  applicant,
  submissions,
  loadingSubmissions,
  onViewAllDocuments,
}: ApplicantCurrentProfileViewProps) {
  const approvedSubmissionId =
    applicant
      .latestApprovedSubmissionId
      ? String(
          applicant
            .latestApprovedSubmissionId
        )
      : "";

  const approvedSubmission =
    approvedSubmissionId
      ? (
          submissions.find(
            (submission) =>
              String(
                submission._id
              ) ===
              approvedSubmissionId
          ) || null
        )
      : null;

  const documents =
    approvedSubmission
      ?.documents;

  const documentGroups =
    documents
      ? [
          {
            label:
              "CV / Resume",
            values:
              documentValues(
                documents.cvResume
              ),
          },
          {
            label:
              "Identity Document",
            values:
              documentValues(
                documents
                  .identityDocument
              ),
          },
          {
            label:
              "Enrollment Document",
            values:
              documentValues(
                documents
                  .enrollmentDocument
              ),
          },
          {
            label:
              "Degree Certificate",
            values:
              documentValues(
                documents
                  .degreeCertificate
              ),
          },
          {
            label:
              "Training Certificates",
            values:
              documentValues(
                documents
                  .trainingCertificates
              ),
          },
          {
            label:
              "Recommendation Letters",
            values:
              documentValues(
                documents
                  .recommendationLetters
              ),
          },
          {
            label:
              "Portfolio / Work Samples",
            values:
              documentValues(
                documents
                  .portfolioWorkSamples
              ),
          },
          {
            label:
              "Additional Supporting Documents",
            values:
              documentValues(
                documents
                  .additionalSupportingDocuments
              ),
          },
        ].filter(
          (group) =>
            group.values.length > 0
        )
      : [];

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <p className="text-xs font-bold text-blue-900">
          Authoritative Current Profile
        </p>

        <p className="mt-1 text-[11px] leading-relaxed text-blue-700">
          This Applicant record contains the current
          administrator-approved state. Original Google Form
          submissions remain immutable and are preserved in
          Submission History.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetadataCard
          label="Profile Version"
          value={
            `v${applicant.profileVersion}`
          }
        />

        <MetadataCard
          label="Current Status"
          value={
            applicant
              .recruitment
              .status
          }
        />

        <MetadataCard
          label="Applicant Source"
          value={
            applicant
              .recruitment
              .source
          }
        />

        <MetadataCard
          label="Approved Submission"
          value={
            approvedSubmissionId
              ? "Linked"
              : "Not linked"
          }
        />
      </div>

      <Section
        title="Identity & Contact"
        description="Current administrator-approved personal and contact information."
      >
        <Field
          label="Full Name"
          value={
            applicant.identity
              .fullName
          }
        />

        <Field
          label="Email"
          value={
            applicant.identity
              .email
          }
        />

        <Field
          label="Phone"
          value={
            applicant.identity
              .phoneNumber
          }
        />

        <Field
          label="WhatsApp"
          value={
            applicant.identity
              .whatsappNumber
          }
        />

        <Field
          label="Country"
          value={
            applicant.identity
              .country
          }
        />

        <Field
          label="City"
          value={
            applicant.identity
              .city
          }
        />
      </Section>

      <Section
        title="Education"
        description="Current approved academic profile."
      >
        <Field
          label="University / Institution"
          value={
            applicant.education
              .universityName
          }
        />

        <Field
          label="Institution Country"
          value={
            applicant.education
              .institutionCountry
          }
        />

        <Field
          label="Degree Level"
          value={
            applicant.education
              .degreeLevel
          }
        />

        <Field
          label="Major"
          value={
            applicant.education
              .major
          }
        />

        <Field
          label="Specialization"
          value={
            applicant.education
              .specialization
          }
        />

        <Field
          label="Study Status"
          value={
            applicant.education
              .studyStatus
          }
        />

        <Field
          label="Graduation Date"
          value={
            displayDate(
              applicant.education
                .graduationDate
            )
          }
        />

        <Field
          label="GPA"
          value={
            applicant.education
              .gpa
          }
        />

        <Field
          label="Grading Scale"
          value={
            applicant.education
              .gradingScale
          }
        />

        <Field
          label="Certifications"
          value={
            applicant.education
              .hasCertifications
          }
        />

        <Field
          label="Certificate Names"
          value={
            applicant.education
              .certificateNames
          }
        />

        <Field
          label="Languages"
          value={
            applicant.education
              .languages
          }
        />

        <Field
          label="English Proficiency"
          value={
            applicant.education
              .englishProficiency
          }
        />

        <Field
          label="Relevant Coursework"
          value={
            applicant.education
              .relevantCoursework
          }
          wide
        />

        <Field
          label="Academic Projects"
          value={
            applicant.education
              .academicProjects
          }
          wide
        />

        <Field
          label="Additional Education"
          value={
            applicant.education
              .additionalEducation
          }
          wide
        />
      </Section>

      <Section
        title="Position & Availability"
        description="Current internship or employment preferences and availability."
      >
        <Field
          label="Position Track"
          value={
            applicant.preferences
              .positionTrack
          }
        />

        <Field
          label="Position Type"
          value={
            applicant.preferences
              .positionType
          }
        />

        <Field
          label="Available Start Date"
          value={
            displayDate(
              applicant.preferences
                .availableStartDate
            )
          }
        />

        <Field
          label="Duration"
          value={
            applicant.preferences
              .duration
          }
        />

        <Field
          label="Weekly Availability"
          value={
            applicant.preferences
              .weeklyAvailability
          }
        />

        <Field
          label="Working Days"
          value={
            applicant.preferences
              .workingDays
          }
        />

        <Field
          label="Working Time"
          value={
            applicant.preferences
              .workingTime
          }
        />

        <Field
          label="Currently Employed"
          value={
            applicant.preferences
              .currentlyEmployed
          }
        />

        <Field
          label="Current Commitment"
          value={
            applicant.preferences
              .currentCommitment
          }
        />

        <Field
          label="Can Commit"
          value={
            applicant.preferences
              .canCommit
          }
        />

        <Field
          label="Objectives"
          value={
            applicant.preferences
              .objectives
          }
          wide
        />

        <Field
          label="University Required"
          value={
            applicant.preferences
              .universityRequired
          }
        />

        <Field
          label="Required Duration"
          value={
            applicant.preferences
              .universityRequiredDuration
          }
        />
      </Section>

      <Section
        title="Skills & Experience"
        description="Current approved technical and professional capabilities."
      >
        <Field
          label="Primary Technical Skills"
          value={
            applicant.skills
              .primaryTechnical
          }
          wide
        />

        <Field
          label="Programming Languages"
          value={
            applicant.skills
              .programmingLanguages
          }
          wide
        />

        <Field
          label="Frameworks"
          value={
            applicant.skills
              .frameworks
          }
          wide
        />

        <Field
          label="Databases"
          value={
            applicant.skills
              .databases
          }
          wide
        />

        <Field
          label="Cloud / DevOps"
          value={
            applicant.skills
              .cloudDevOps
          }
          wide
        />

        <Field
          label="Development Tools"
          value={
            applicant.skills
              .developmentTools
          }
          wide
        />

        <Field
          label="Soft Skills"
          value={
            applicant.skills
              .softSkills
          }
          wide
        />

        <Field
          label="Technical Experience Level"
          value={
            applicant.skills
              .technicalExperienceLevel
          }
        />

        <Field
          label="Professional Experience"
          value={
            applicant.skills
              .professionalExperience
          }
        />

        <Field
          label="Previous Experience"
          value={
            applicant.skills
              .previousExperience
          }
        />

        <Field
          label="Previous Experience Details"
          value={
            applicant.skills
              .previousExperienceDetails
          }
          wide
        />

        <Field
          label="Data Engineering"
          value={
            applicant.skills
              .dataEngineerSkills
          }
          wide
        />

        <Field
          label="AI / ML"
          value={
            applicant.skills
              .aiMlEngineerSkills
          }
          wide
        />

        <Field
          label="Data Analytics"
          value={
            applicant.skills
              .dataAnalystSkills
          }
          wide
        />

        <Field
          label="Other Technical Skills"
          value={
            applicant.skills
              .otherTechnical
          }
          wide
        />

        <Field
          label="Skills to Improve"
          value={
            applicant.skills
              .skillsToImprove
          }
          wide
        />

        <Field
          label="Additional Skills"
          value={
            applicant.skills
              .additionalSkills
          }
          wide
        />
      </Section>

      <Section
        title="Professional Profiles"
      >
        <Field
          label="LinkedIn"
          value={
            applicant.profiles
              .linkedin
          }
        />

        <Field
          label="GitHub"
          value={
            applicant.profiles
              .github
          }
        />

        <Field
          label="Portfolio"
          value={
            applicant.profiles
              .portfolio
          }
        />

        <Field
          label="Social Media"
          value={
            applicant.profiles
              .socialMedia
          }
        />
      </Section>

      <Section
        title="Recruitment State"
        description="Controlled current recruitment information from the Applicant master record."
      >
        <Field
          label="Status"
          value={
            applicant.recruitment
              .status
          }
        />

        <Field
          label="Source"
          value={
            applicant.recruitment
              .source
          }
        />

        <Field
          label="Assigned Recruiter"
          value={
            applicant.recruitment
              .assignedRecruiterId
          }
        />

        <Field
          label="First Applied"
          value={
            displayDateTime(
              applicant.recruitment
                .firstAppliedAt
            )
          }
        />

        <Field
          label="Last Applied"
          value={
            displayDateTime(
              applicant.recruitment
                .lastAppliedAt
            )
          }
        />

        <Field
          label="Last Activity"
          value={
            displayDateTime(
              applicant.recruitment
                .lastActivityAt
            )
          }
        />

        <Field
          label="Tags"
          value={
            applicant.recruitment
              .tags
          }
          wide
        />
      </Section>

      <Section
        title="Lifecycle & Version"
      >
        <Field
          label="Profile Version"
          value={
            applicant.profileVersion
          }
        />

        <Field
          label="Archived"
          value={
            applicant.lifecycle
              .archived
          }
        />

        <Field
          label="Archived At"
          value={
            displayDateTime(
              applicant.lifecycle
                .archivedAt
            )
          }
        />

        <Field
          label="Archived By"
          value={
            applicant.lifecycle
              .archivedBy
          }
        />

        <Field
          label="Archive Reason"
          value={
            applicant.lifecycle
              .archiveReason
          }
          wide
        />

        <Field
          label="Record Created"
          value={
            displayDateTime(
              applicant.createdAt
            )
          }
        />

        <Field
          label="Last Updated"
          value={
            displayDateTime(
              applicant.updatedAt
            )
          }
        />
      </Section>

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">
              Current Approved Documents
            </h4>

            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Documents remain immutable inside their source
              submission. This area resolves only the submission
              referenced by latestApprovedSubmissionId.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
              {approvedSubmissionId
                ? "Approved source linked"
                : "No approved source"}
            </span>

            <button
              type="button"
              onClick={onViewAllDocuments}
              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50"
            >
              View All Documents
            </button>
          </div>
        </div>

        {loadingSubmissions ? (
          <p className="mt-4 text-xs text-slate-400">
            Loading approved documents...
          </p>
        ) : !approvedSubmissionId ? (
          <p className="mt-4 text-xs text-slate-400">
            No approved submission reference has been set yet.
            Historical documents remain available in the Documents
            tab.
          </p>
        ) : !approvedSubmission ? (
          <p className="mt-4 text-xs text-amber-600">
            The approved submission reference could not be resolved
            from the linked submission history.
          </p>
        ) : (
          <div className="mt-4">
            <div className="mb-4 rounded-lg bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Approved Source Submission
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-700">
                {approvedSubmission
                  .submittedAt
                  ? displayDateTime(
                      approvedSubmission
                        .submittedAt
                    )
                  : "Linked immutable submission"}
              </p>
            </div>

            {documentGroups.length === 0 ? (
              <p className="text-xs text-slate-400">
                No approved documents are available in this source
                submission.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {documentGroups.map(
                  (group) => (
                    <div
                      key={group.label}
                      className="rounded-lg border border-slate-100 p-3"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {group.label}
                      </p>

                      <div className="mt-2 space-y-1">
                        {group.values.map(
                          (
                            url,
                            index
                          ) => (
                            <a
                              key={`${group.label}-${index}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block break-all text-xs font-semibold text-blue-600 hover:underline"
                            >
                              Open document
                              {group.values
                                .length > 1
                                ? ` ${index + 1}`
                                : ""}
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">
          Current Evaluation
        </h4>

        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          No authoritative current Applicant evaluation exists yet.
          Evaluation and rating will be managed by the dedicated
          Evaluation & Rating module.
        </p>

        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          Historical form ratings are intentionally not treated as
          the Applicant&apos;s current evaluation.
        </p>
      </section>
    </div>
  );
}
