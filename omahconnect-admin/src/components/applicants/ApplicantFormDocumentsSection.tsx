import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ExternalLink,
  FileCheck2,
  FileText,
  RefreshCcw,
} from "lucide-react";

import {
  fetchApplicantSubmissions,
  type ApplicantDocument,
  type ApplicantFormSubmission,
} from "../../services/api";


interface ApplicantFormDocumentsSectionProps {
  applicantId: string;

  managedDocuments:
    ApplicantDocument[];
}


interface FormDocumentItem {
  key: string;
  title: string;
  category: string;
  url: string;
  submissionId: string;
  submittedAt: string | null;
}


function safeExternalUrl(
  value: unknown
): string | null {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  try {
    const url =
      new URL(
        value.trim()
      );

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}


function formatDate(
  value:
    string |
    null |
    undefined
) {
  if (!value) {
    return "Date unavailable";
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? "Date unavailable"
    : date.toLocaleString();
}


function valuesOf(
  value:
    string |
    string[] |
    undefined
): string[] {
  if (Array.isArray(value)) {
    return value
      .map(
        item =>
          String(
            item || ""
          ).trim()
      )
      .filter(Boolean);
  }

  const single =
    String(
      value || ""
    ).trim();

  return single
    ? [single]
    : [];
}


function submissionDocuments(
  submission:
    ApplicantFormSubmission
): FormDocumentItem[] {
  const documents =
    submission.documents;

  if (!documents) {
    return [];
  }

  const submittedAt =
    submission.submittedAt ||
    submission.createdAt ||
    null;

  const definitions = [
    {
      field:
        "cvResume",

      title:
        "CV / Resume",

      category:
        "CV / Resume",

      values:
        valuesOf(
          documents.cvResume
        ),
    },

    {
      field:
        "identityDocument",

      title:
        "Identity Document / ID Card",

      category:
        "Identity Document",

      values:
        valuesOf(
          documents.identityDocument
        ),
    },

    {
      field:
        "enrollmentDocument",

      title:
        "Enrollment Document",

      category:
        "Enrollment",

      values:
        valuesOf(
          documents.enrollmentDocument
        ),
    },

    {
      field:
        "degreeCertificate",

      title:
        "Degree Certificate",

      category:
        "Degree",

      values:
        valuesOf(
          documents.degreeCertificate
        ),
    },

    {
      field:
        "trainingCertificates",

      title:
        "Training Certificate",

      category:
        "Certificate",

      values:
        valuesOf(
          documents.trainingCertificates
        ),
    },

    {
      field:
        "recommendationLetters",

      title:
        "Recommendation Letter",

      category:
        "Recommendation",

      values:
        valuesOf(
          documents.recommendationLetters
        ),
    },

    {
      field:
        "portfolioWorkSamples",

      title:
        "Portfolio / Work Sample",

      category:
        "Portfolio",

      values:
        valuesOf(
          documents.portfolioWorkSamples
        ),
    },

    {
      field:
        "additionalSupportingDocuments",

      title:
        "Additional Supporting Document",

      category:
        "Supporting Document",

      values:
        valuesOf(
          documents
            .additionalSupportingDocuments
        ),
    },
  ];


  return definitions.flatMap(
    definition =>
      definition.values
        .map(
          (
            rawUrl,
            index
          ) => {
            const url =
              safeExternalUrl(
                rawUrl
              );

            if (!url) {
              return null;
            }

            return {
              key:
                [
                  submission._id,
                  definition.field,
                  index,
                  url,
                ].join(":"),

              title:
                definition.values
                  .length >
                1
                  ? `${definition.title} ${index + 1}`
                  : definition.title,

              category:
                definition.category,

              url,

              submissionId:
                submission._id,

              submittedAt,
            };
          }
        )
        .filter(
          (
            item
          ): item is FormDocumentItem =>
            Boolean(item)
        )
  );
}


export function ApplicantFormDocumentsSection({
  applicantId,
  managedDocuments,
}: ApplicantFormDocumentsSectionProps) {
  const [
    submissions,
    setSubmissions,
  ] = useState<
    ApplicantFormSubmission[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  async function load() {
    try {
      setLoading(true);
      setError("");

      const result =
        await fetchApplicantSubmissions(
          applicantId
        );

      setSubmissions(
        result
      );
    } catch (
      loadError
    ) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load Form submission documents."
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(
    () => {
      void load();
    },
    [
      applicantId,
    ]
  );


  const items =
    useMemo(
      () => {
        const managedUrls =
          new Set(
            managedDocuments
              .map(
                document =>
                  safeExternalUrl(
                    document
                      .storage
                      .externalUrl
                  )
              )
              .filter(
                (
                  value
                ): value is string =>
                  Boolean(value)
              )
          );


        const orderedSubmissions =
          [...submissions].sort(
            (
              left,
              right
            ) => {
              const leftDate =
                new Date(
                  left.submittedAt ||
                  left.createdAt ||
                  0
                ).getTime();

              const rightDate =
                new Date(
                  right.submittedAt ||
                  right.createdAt ||
                  0
                ).getTime();

              return (
                rightDate -
                leftDate
              );
            }
          );


        const seen =
          new Set<string>();

        const result:
          FormDocumentItem[] =
          [];


        for (
          const submission
          of orderedSubmissions
        ) {
          for (
            const item
            of submissionDocuments(
              submission
            )
          ) {
            /*
             * If the exact external file has
             * already been normalized into the
             * managed document system, do not
             * display it twice.
             */
            if (
              managedUrls.has(
                item.url
              )
            ) {
              continue;
            }

            /*
             * A Form may be submitted more than
             * once with the same attachment.
             * Show that file only once.
             */
            if (
              seen.has(
                item.url
              )
            ) {
              continue;
            }

            seen.add(
              item.url
            );

            result.push(
              item
            );
          }
        }


        return result;
      },
      [
        managedDocuments,
        submissions,
      ]
    );


  return (
    <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <FileCheck2 className="h-4 w-4 text-violet-600" />

            Original Form Documents
          </h3>

          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            Files submitted through the Applicant Form are shown here directly from the immutable Form response history. These records are read-only.
          </p>
        </div>

        <button
          type="button"
          disabled={
            loading
          }
          onClick={() =>
            void load()
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCcw
            className={
              `h-3.5 w-3.5 ${
                loading
                  ? "animate-spin"
                  : ""
              }`
            }
          />

          Refresh
        </button>
      </div>


      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}


      {loading ? (
        <p className="mt-5 text-xs text-slate-400">
          Loading Form submission documents...
        </p>
      ) : items.length ===
        0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <FileText className="mx-auto h-7 w-7 text-slate-300" />

          <p className="mt-2 text-xs font-semibold text-slate-600">
            No Form submission documents found.
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            This Applicant may still have files in Managed Documents above.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-violet-700">
              {
                items.length
              }{" "}
              submitted file
              {
                items.length ===
                1
                  ? ""
                  : "s"
              }
            </span>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-600">
              Form Submission
            </span>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-600">
              Read Only
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {items.map(
              item => (
                <div
                  key={
                    item.key
                  }
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold text-slate-900">
                          {
                            item.title
                          }
                        </p>

                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[8px] font-bold uppercase text-violet-700">
                          Form
                        </span>
                      </div>

                      <p className="mt-1 text-[10px] font-semibold text-slate-500">
                        {
                          item.category
                        }
                      </p>

                      <p className="mt-2 text-[10px] text-slate-400">
                        Submitted{" "}
                        {
                          formatDate(
                            item.submittedAt
                          )
                        }
                      </p>
                    </div>

                    <a
                      href={
                        item.url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-700 hover:bg-violet-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />

                      Open File
                    </a>
                  </div>
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
