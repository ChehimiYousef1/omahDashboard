import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Archive,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  History,
  RefreshCw,
  RotateCcw,
  Search,
  Star,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import {
  applicantDocumentDownloadUrl,
  archiveApplicantDocumentRecord,
  downloadApplicantDocumentFile,
  fetchApplicantDocumentLibrary,
  fetchApplicantDocumentVersions,
  restoreApplicantDocumentRecord,
  setApplicantDocumentCurrent,
  uploadApplicantDocumentVersion,
  type ApplicantDocument,
  type ApplicantDocumentLibraryItem,
  type ApplicantDocumentLibraryOrigin,
  type ApplicantDocumentLibraryResponse,
  type ApplicantDocumentLibraryState,
  type ApplicantSearchQuery,
} from "../../../services/api";


interface ApplicantDocumentManagementCenterProps {
  filters:
    ApplicantSearchQuery;

  onOpenApplicant?: (
    applicantId: string
  ) =>
    void |
    Promise<void>;

  onDocumentsChanged?: () =>
    void |
    Promise<void>;
}


const categoryLabels:
  Record<string, string> = {
    cv:
      "CV / Resume",

    identity_document:
      "Identity Document",

    enrollment_document:
      "Enrollment Document",

    degree_certificate:
      "Degree Certificate",

    training_certificate:
      "Training Certificate",

    recommendation_letter:
      "Recommendation Letter",

    portfolio:
      "Portfolio / Work Sample",

    cover_letter:
      "Cover Letter",

    transcript:
      "Transcript",

    certificate:
      "Certificate",

    supporting_document:
      "Supporting Document",

    other:
      "Other",
  };


function errorMessage(
  error: unknown
) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error
  ) {
    const response =
      (
        error as {
          response?: {
            data?: {
              error?: string;
            };
          };
        }
      ).response;

    if (
      response?.data?.error
    ) {
      return response
        .data
        .error;
    }
  }

  return error instanceof Error
    ? error.message
    : "Unable to load Applicant documents.";
}


function formatDate(
  value:
    string |
    null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? "—"
    : date.toLocaleDateString();
}


function formatFileSize(
  value: number
) {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "—";
  }

  if (
    value <
    1024
  ) {
    return `${value} B`;
  }

  if (
    value <
    1024 * 1024
  ) {
    return `${(
      value /
      1024
    ).toFixed(1)} KB`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}


function stateLabel(
  item:
    ApplicantDocumentLibraryItem
) {
  if (
    item.origin ===
    "form_submission"
  ) {
    return "Submitted";
  }

  if (
    item.state ===
    "current"
  ) {
    return "Current";
  }

  if (
    item.state ===
    "archived"
  ) {
    return "Archived";
  }

  return "Historical";
}


export function ApplicantDocumentManagementCenter({
  filters,
  onOpenApplicant,
  onDocumentsChanged,
}: ApplicantDocumentManagementCenterProps) {
  const [
    library,
    setLibrary,
  ] = useState<
    ApplicantDocumentLibraryResponse |
    null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string |
    null
  >(null);

  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const [
    appliedSearch,
    setAppliedSearch,
  ] = useState("");

  const [
    origin,
    setOrigin,
  ] = useState<
    ApplicantDocumentLibraryOrigin
  >("all");

  const [
    category,
    setCategory,
  ] = useState("all");

  const [
    state,
    setState,
  ] = useState<
    ApplicantDocumentLibraryState
  >("current");

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    versionOwner,
    setVersionOwner,
  ] = useState<
    ApplicantDocumentLibraryItem |
    null
  >(null);

  const [
    versions,
    setVersions,
  ] = useState<
    ApplicantDocument[]
  >([]);

  const [
    versionsLoading,
    setVersionsLoading,
  ] = useState(false);


  const loadLibrary =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          setError(
            null
          );

          const result =
            await fetchApplicantDocumentLibrary(
              filters,
              {
                origin,
                category,
                state,

                fileQ:
                  appliedSearch,

                page,
                limit:
                  25,
              }
            );

          setLibrary(
            result
          );
        } catch (
          loadError
        ) {
          setError(
            errorMessage(
              loadError
            )
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        filters,
        origin,
        category,
        state,
        appliedSearch,
        page,
      ]
    );


  useEffect(
    () => {
      void loadLibrary();
    },
    [
      loadLibrary,
    ]
  );


  useEffect(
    () => {
      setPage(
        1
      );
    },
    [
      filters,
      origin,
      category,
      state,
      appliedSearch,
    ]
  );


  function submitSearch(
    event:
      React.FormEvent
  ) {
    event.preventDefault();

    setPage(
      1
    );

    setAppliedSearch(
      searchInput.trim()
    );
  }


  function openManagedDocument(
    item:
      ApplicantDocumentLibraryItem
  ) {
    const documentId =
      item.managed
        ?.documentId;

    if (!documentId) {
      return;
    }

    window.open(
      applicantDocumentDownloadUrl(
        item.applicant.id,
        documentId
      ),
      "_blank",
      "noopener,noreferrer"
    );
  }


async function downloadManagedDocument(
    item:
      ApplicantDocumentLibraryItem
  ) {
    const documentId =
      item.managed
        ?.documentId;

    if (!documentId) {
      return;
    }

    try {
      setBusy(
        true
      );

      await downloadApplicantDocumentFile(
        item.applicant.id,
        documentId,
        item.fileName ||
          item.title ||
          "document"
      );
    } catch (
      downloadError
    ) {
      window.alert(
        errorMessage(
          downloadError
        )
      );
    } finally {
      setBusy(
        false
      );
    }
  }


  async function refreshAfterMutation() {
    await loadLibrary();

    await onDocumentsChanged?.();
  }


  async function loadVersions(
    item:
      ApplicantDocumentLibraryItem
  ) {
    const documentId =
      item.managed
        ?.documentId;

    if (
      item.origin !==
        "managed" ||
      !documentId
    ) {
      return;
    }

    try {
      setVersionsLoading(
        true
      );

      const result =
        await fetchApplicantDocumentVersions(
          item.applicant.id,
          documentId
        );

      setVersionOwner(
        item
      );

      setVersions(
        result
      );
    } catch (
      historyError
    ) {
      window.alert(
        errorMessage(
          historyError
        )
      );
    } finally {
      setVersionsLoading(
        false
      );
    }
  }


  async function reloadOpenVersions() {
    if (
      !versionOwner
    ) {
      return;
    }

    const documentId =
      versionOwner
        .managed
        ?.documentId;

    if (!documentId) {
      return;
    }

    try {
      setVersionsLoading(
        true
      );

      const result =
        await fetchApplicantDocumentVersions(
          versionOwner
            .applicant
            .id,
          documentId
        );

      setVersions(
        result
      );
    } catch (
      historyError
    ) {
      window.alert(
        errorMessage(
          historyError
        )
      );
    } finally {
      setVersionsLoading(
        false
      );
    }
  }


  async function afterManagedMutation() {
    await refreshAfterMutation();

    if (
      versionOwner
    ) {
      await reloadOpenVersions();
    }
  }


  async function replaceManagedDocument(
    item:
      ApplicantDocumentLibraryItem,
    file:
      File
  ) {
    const managed =
      item.managed;

    if (
      !managed ||
      !managed.isCurrent ||
      managed.archived
    ) {
      window.alert(
        "Only the active current version can be replaced."
      );

      return;
    }

    try {
      setBusy(
        true
      );

      await uploadApplicantDocumentVersion(
        item.applicant.id,
        managed.documentId,
        file,
        item.title ||
          undefined
      );

      await afterManagedMutation();

      window.alert(
        "New document version created successfully."
      );
    } catch (
      replaceError
    ) {
      window.alert(
        errorMessage(
          replaceError
        )
      );
    } finally {
      setBusy(
        false
      );
    }
  }


  async function archiveManagedDocument(
    item:
      ApplicantDocumentLibraryItem
  ) {
    const managed =
      item.managed;

    if (
      !managed ||
      managed.archived
    ) {
      return;
    }

    if (
      !window.confirm(
        "Archive this document version? Its version history will remain preserved."
      )
    ) {
      return;
    }

    const reason =
      window.prompt(
        "Optional archive reason:",
        ""
      ) ?? "";

    try {
      setBusy(
        true
      );

      await archiveApplicantDocumentRecord(
        item.applicant.id,
        managed.documentId,
        reason
      );

      await afterManagedMutation();
    } catch (
      archiveError
    ) {
      window.alert(
        errorMessage(
          archiveError
        )
      );
    } finally {
      setBusy(
        false
      );
    }
  }


  async function restoreManagedDocument(
    item:
      ApplicantDocumentLibraryItem
  ) {
    const managed =
      item.managed;

    if (
      !managed ||
      !managed.archived
    ) {
      return;
    }

    if (
      !window.confirm(
        "Restore this document version? Restoring it will not automatically make it current."
      )
    ) {
      return;
    }

    try {
      setBusy(
        true
      );

      await restoreApplicantDocumentRecord(
        item.applicant.id,
        managed.documentId
      );

      await afterManagedMutation();
    } catch (
      restoreError
    ) {
      window.alert(
        errorMessage(
          restoreError
        )
      );
    } finally {
      setBusy(
        false
      );
    }
  }


  async function setManagedDocumentCurrent(
    item:
      ApplicantDocumentLibraryItem
  ) {
    const managed =
      item.managed;

    if (
      !managed ||
      managed.archived ||
      managed.isCurrent
    ) {
      return;
    }

    if (
      !window.confirm(
        `Set version ${managed.version} as the current document version?`
      )
    ) {
      return;
    }

    try {
      setBusy(
        true
      );

      await setApplicantDocumentCurrent(
        item.applicant.id,
        managed.documentId
      );

      await afterManagedMutation();
    } catch (
      currentError
    ) {
      window.alert(
        errorMessage(
          currentError
        )
      );
    } finally {
      setBusy(
        false
      );
    }
  }


  function isUnavailableFormExternalVersion(
    version:
      ApplicantDocument
  ) {
    return (
      version.source ===
        "form_submission" &&
      version.storage
        ?.provider ===
        "external"
    );
  }


  function openVersion(
    applicantId:
      string,
    version:
      ApplicantDocument
  ) {
    if (
      isUnavailableFormExternalVersion(
        version
      )
    ) {
      window.alert(
        "Managed copy unavailable for this historical Form version."
      );

      return;
    }

    window.open(
      applicantDocumentDownloadUrl(
        applicantId,
        version._id
      ),
      "_blank",
      "noopener,noreferrer"
    );
  }


  async function downloadVersion(
    applicantId:
      string,
    version:
      ApplicantDocument
  ) {
    if (
      isUnavailableFormExternalVersion(
        version
      )
    ) {
      window.alert(
        "Managed copy unavailable for this historical Form version."
      );

      return;
    }

    try {
      setBusy(
        true
      );

      await downloadApplicantDocumentFile(
        applicantId,
        version._id,
        version.file
          ?.originalFileName ||
          version.title ||
          "document"
      );
    } catch (
      downloadError
    ) {
      window.alert(
        errorMessage(
          downloadError
        )
      );
    } finally {
      setBusy(
        false
      );
    }
  }


  async function replaceVersion(
    applicantId:
      string,
    version:
      ApplicantDocument,
    file:
      File
  ) {
    if (
      !version.isCurrent ||
      version.lifecycle
        ?.archived
    ) {
      window.alert(
        "Only the active current version can be replaced."
      );

      return;
    }

    try {
      setBusy(
        true
      );

      await uploadApplicantDocumentVersion(
        applicantId,
        version._id,
        file,
        version.title ||
          undefined
      );

      await afterManagedMutation();

      window.alert(
        "New document version created successfully."
      );
    } catch (
      replaceError
    ) {
      window.alert(
        errorMessage(
          replaceError
        )
      );
    } finally {
      setBusy(
        false
      );
    }
  }


  async function setVersionCurrent(
    applicantId:
      string,
    version:
      ApplicantDocument
  ) {
    if (
      version.isCurrent ||
      version.lifecycle
        ?.archived
    ) {
      return;
    }

    if (
      !window.confirm(
        `Set version ${version.version} as the current document version?`
      )
    ) {
      return;
    }

    try {
      setBusy(
        true
      );

      await setApplicantDocumentCurrent(
        applicantId,
        version._id
      );

      await afterManagedMutation();
    } catch (
      currentError
    ) {
      window.alert(
        errorMessage(
          currentError
        )
      );
    } finally {
      setBusy(
        false
      );
    }
  }


  async function archiveVersion(
    applicantId:
      string,
    version:
      ApplicantDocument
  ) {
    if (
      version.lifecycle
        ?.archived
    ) {
      return;
    }

    if (
      !window.confirm(
        `Archive version ${version.version}? Its history will remain preserved.`
      )
    ) {
      return;
    }

    const reason =
      window.prompt(
        "Optional archive reason:",
        ""
      ) ?? "";

    try {
      setBusy(
        true
      );

      await archiveApplicantDocumentRecord(
        applicantId,
        version._id,
        reason
      );

      await afterManagedMutation();
    } catch (
      archiveError
    ) {
      window.alert(
        errorMessage(
          archiveError
        )
      );
    } finally {
      setBusy(
        false
      );
    }
  }


  async function restoreVersion(
    applicantId:
      string,
    version:
      ApplicantDocument
  ) {
    if (
      !version.lifecycle
        ?.archived
    ) {
      return;
    }

    if (
      !window.confirm(
        `Restore version ${version.version}? It will not automatically become current.`
      )
    ) {
      return;
    }

    try {
      setBusy(
        true
      );

      await restoreApplicantDocumentRecord(
        applicantId,
        version._id
      );

      await afterManagedMutation();
    } catch (
      restoreError
    ) {
      window.alert(
        errorMessage(
          restoreError
        )
      );
    } finally {
      setBusy(
        false
      );
    }
  }


  const summary =
    library?.summary;


  return (
    <section className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <FolderOpen className="h-4 w-4 text-blue-600" />

            Applicant Document Management Center
          </h3>

          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            Central library of managed Applicant documents and immutable files submitted through the recruitment Form. The current Applicant analytics cohort is respected automatically.
          </p>
        </div>

        <button
          type="button"
          disabled={
            loading
          }
          onClick={() =>
            void loadLibrary()
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={
              `h-3.5 w-3.5 ${
                loading
                  ? "animate-spin"
                  : ""
              }`
            }
          />

          Refresh Library
        </button>
      </div>


      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          {
            label:
              "Current Files",

            value:
              summary
                ?.currentInventoryFiles ??
              0,
          },

          {
            label:
              "Managed Current",

            value:
              summary
                ?.managedCurrent ??
              0,
          },

          {
            label:
              "Form Files",

            value:
              summary
                ?.formSubmitted ??
              0,
          },

          {
            label:
              "Archived",

            value:
              summary
                ?.managedArchived ??
              0,
          },

          {
            label:
              "Applicants With CV",

            value:
              summary
                ?.applicantsWithCv ??
              0,
          },

          {
            label:
              "Applicants Missing CV",

            value:
              summary
                ?.applicantsMissingCv ??
              0,
          },
        ].map(
          card => (
            <article
              key={
                card.label
              }
              className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
            >
              <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                {
                  card.label
                }
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {
                  card.value
                }
              </p>
            </article>
          )
        )}
      </div>


      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_220px_180px]">
          <form
            onSubmit={
              submitSearch
            }
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={
                  searchInput
                }
                onChange={
                  event =>
                    setSearchInput(
                      event.target
                        .value
                    )
                }
                placeholder="Search document title, filename or source"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-blue-400"
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-blue-700"
            >
              Search
            </button>
          </form>


          <select
            value={
              origin
            }
            onChange={
              event => {
                setOrigin(
                  event.target
                    .value as
                    ApplicantDocumentLibraryOrigin
                );
              }
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="all">
              All Sources
            </option>

            <option value="managed">
              Managed Documents
            </option>

            <option value="form_submission">
              Form Submission
            </option>
          </select>


          <select
            value={
              category
            }
            onChange={
              event =>
                setCategory(
                  event.target
                    .value
                )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="all">
              All Document Categories
            </option>

            {(
              library
                ?.filterOptions
                .categories ||
              Object.keys(
                categoryLabels
              )
            ).map(
              option => (
                <option
                  key={
                    option
                  }
                  value={
                    option
                  }
                >
                  {
                    categoryLabels[
                      option
                    ] ||
                    option
                  }
                </option>
              )
            )}
          </select>


          <select
            value={
              state
            }
            onChange={
              event => {
                setState(
                  event.target
                    .value as
                    ApplicantDocumentLibraryState
                );
              }
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="current">
              Current Inventory
            </option>

            <option value="historical">
              Historical Managed
            </option>

            <option value="archived">
              Archived Managed
            </option>

            <option value="all">
              All States
            </option>
          </select>
        </div>


        {appliedSearch && (
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold text-blue-700">
              Document search:{" "}
              {
                appliedSearch
              }
            </span>

            <button
              type="button"
              onClick={() => {
                setSearchInput(
                  ""
                );

                setAppliedSearch(
                  ""
                );
              }}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          </div>
        )}
      </div>


      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          {
            error
          }
        </div>
      )}


      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-xs font-bold text-slate-900">
              Document Library
            </p>

            <p className="mt-0.5 text-[10px] text-slate-400">
              {
                library
                  ?.pagination
                  .total ??
                0
              }{" "}
              matching file
              {
                (
                  library
                    ?.pagination
                    .total ??
                  0
                ) ===
                1
                  ? ""
                  : "s"
              }
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[9px] font-bold uppercase">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
              Managed
            </span>

            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
              Form Submission
            </span>
          </div>
        </div>


        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">
            Loading centralized document library...
          </div>
        ) : !library ||
          library.items.length ===
            0 ? (
          <div className="p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-300" />

            <p className="mt-2 text-xs font-semibold text-slate-600">
              No documents match these filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">
                    Applicant
                  </th>

                  <th className="px-4 py-3">
                    Document
                  </th>

                  <th className="px-4 py-3">
                    Category
                  </th>

                  <th className="px-4 py-3">
                    Source
                  </th>

                  <th className="px-4 py-3">
                    Date
                  </th>

                  <th className="px-4 py-3">
                    State
                  </th>

                  <th className="px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {library.items.map(
                  item => (
                    <tr
                      key={
                        item.id
                      }
                      className="align-top hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3">
                        <p className="text-[11px] font-bold text-slate-800">
                          {
                            item
                              .applicant
                              .fullName ||
                            "Unnamed Applicant"
                          }
                        </p>

                        <p className="mt-1 text-[9px] text-slate-400">
                          {
                            item
                              .applicant
                              .email ||
                            "No email"
                          }
                        </p>

                        <p className="mt-1 text-[9px] text-slate-400">
                          {[
                            item
                              .applicant
                              .positionTrack,
                            item
                              .applicant
                              .country,
                            item
                              .applicant
                              .city,
                          ]
                            .filter(
                              Boolean
                            )
                            .join(
                              " · "
                            ) ||
                            "—"}
                        </p>
                      </td>


                      <td className="px-4 py-3">
                        <p className="max-w-[240px] truncate text-[11px] font-semibold text-slate-700">
                          {
                            item.title
                          }
                        </p>

                        {item.fileName && (
                          <p className="mt-1 max-w-[240px] truncate text-[9px] text-slate-400">
                            {
                              item.fileName
                            }
                          </p>
                        )}

                        {item.sizeBytes >
                          0 && (
                          <p className="mt-1 text-[9px] text-slate-400">
                            {
                              formatFileSize(
                                item.sizeBytes
                              )
                            }
                          </p>
                        )}
                      </td>


                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">
                          {
                            item.categoryLabel
                          }
                        </span>
                      </td>


                      <td className="px-4 py-3">
                        {item.origin ===
                        "managed" ? (
                          <>
                            <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">
                              Managed
                            </span>

                            <p className="mt-1 text-[9px] text-slate-400">
                              {
                                item.managed
                                  ?.source ||
                                "Unknown source"
                              }
                            </p>

                            {item.managed && (
                              <p className="mt-1 text-[9px] text-slate-400">
                                Version{" "}
                                {
                                  item
                                    .managed
                                    .version
                                }
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="inline-flex rounded-full bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700">
                              Form Submission
                            </span>

                            <p className="mt-1 text-[9px] text-slate-400">
                              Immutable source
                            </p>
                          </>
                        )}
                      </td>


                      <td className="px-4 py-3 text-[10px] text-slate-500">
                        {
                          formatDate(
                            item.date
                          )
                        }
                      </td>


                      <td className="px-4 py-3">
                        <span
                          className={
                            `inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${
                              item.state ===
                              "archived"
                                ? "bg-slate-100 text-slate-500"
                                : item.state ===
                                  "historical"
                                  ? "bg-amber-50 text-amber-700"
                                  : item.origin ===
                                    "form_submission"
                                    ? "bg-violet-50 text-violet-700"
                                    : "bg-emerald-50 text-emerald-700"
                            }`
                          }
                        >
                          {
                            stateLabel(
                              item
                            )
                          }
                        </span>
                      </td>


                      <td className="px-4 py-3">
                        <div className="flex min-w-[230px] flex-wrap gap-2">
                          {item.origin ===
                          "managed" ? (
                            <>
                              <button
                                type="button"
                                disabled={
                                  !item.available ||
                                  item.state ===
                                    "archived"
                                }
                                onClick={() =>
                                  openManagedDocument(
                                    item
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[9px] font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View
                              </button>

                              <button
                                type="button"
                                disabled={
                                  busy ||
                                  !item.available ||
                                  item.state ===
                                    "archived"
                                }
                                onClick={() =>
                                  void downloadManagedDocument(
                                    item
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </button>

                              <button
                                type="button"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  void loadVersions(
                                    item
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                              >
                                <History className="h-3 w-3" />
                                Versions
                              </button>

                              {item.managed
                                ?.isCurrent &&
                                !item.managed
                                  .archived && (
                                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[9px] font-bold text-indigo-700 hover:bg-indigo-100">
                                  <Upload className="h-3 w-3" />

                                  Replace

                                  <input
                                    type="file"
                                    disabled={
                                      busy
                                    }
                                    className="hidden"
                                    onChange={
                                      event => {
                                        const file =
                                          event
                                            .currentTarget
                                            .files?.[0];

                                        event
                                          .currentTarget
                                          .value =
                                          "";

                                        if (file) {
                                          void replaceManagedDocument(
                                            item,
                                            file
                                          );
                                        }
                                      }
                                    }
                                  />
                                </label>
                              )}

                              {!item.managed
                                ?.isCurrent &&
                                !item.managed
                                  ?.archived && (
                                <button
                                  type="button"
                                  disabled={
                                    busy
                                  }
                                  onClick={() =>
                                    void setManagedDocumentCurrent(
                                      item
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[9px] font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                                >
                                  <Star className="h-3 w-3" />
                                  Set Current
                                </button>
                              )}

                              {item.managed
                                ?.archived ? (
                                <button
                                  type="button"
                                  disabled={
                                    busy
                                  }
                                  onClick={() =>
                                    void restoreManagedDocument(
                                      item
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[9px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Restore
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={
                                    busy
                                  }
                                  onClick={() =>
                                    void archiveManagedDocument(
                                      item
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[9px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40"
                                >
                                  <Archive className="h-3 w-3" />
                                  Archive
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="Use the managed Applicant document when available."
                              className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[9px] font-bold text-slate-500 opacity-70"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Managed Copy Unavailable
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              void onOpenApplicant?.(
                                item
                                  .applicant
                                  .id
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-bold text-slate-600 hover:bg-slate-50"
                          >
                            <UserRound className="h-3 w-3" />
                            Open Applicant
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}


        {library &&
          library.pagination.pages >
            1 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <p className="text-[10px] text-slate-400">
              Page{" "}
              {
                library
                  .pagination
                  .page
              }{" "}
              of{" "}
              {
                library
                  .pagination
                  .pages
              }
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  library
                    .pagination
                    .page <=
                  1
                }
                onClick={() =>
                  setPage(
                    current =>
                      Math.max(
                        1,
                        current -
                          1
                      )
                  )
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={
                  library
                    .pagination
                    .page >=
                  library
                    .pagination
                    .pages
                }
                onClick={() =>
                  setPage(
                    current =>
                      current + 1
                  )
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>


      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-[10px] leading-4 text-blue-700">
        Original Form documents are immutable and therefore expose only safe read actions. Managed document versioning and lifecycle actions remain protected by the dedicated Applicant Document Management API.
      </div>


      {versionOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <History className="h-4 w-4 text-blue-600" />

                  Document Version History
                </h4>

                <p className="mt-1 text-[10px] text-slate-500">
                  {
                    versionOwner.title
                  }
                  {" · "}
                  {
                    versionOwner
                      .applicant
                      .fullName ||
                    "Applicant"
                  }
                </p>

                <p className="mt-1 text-[9px] text-slate-400">
                  Previous versions remain preserved. Replacing a current document creates a new immutable version.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setVersionOwner(
                    null
                  );

                  setVersions(
                    []
                  );
                }}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Close version history"
              >
                <X className="h-4 w-4" />
              </button>
            </div>


            <div className="max-h-[70vh] overflow-auto">
              {versionsLoading ? (
                <div className="p-10 text-center text-xs text-slate-400">
                  Loading document versions...
                </div>
              ) : versions.length ===
                0 ? (
                <div className="p-10 text-center text-xs text-slate-400">
                  No document versions were found.
                </div>
              ) : (
                <table className="min-w-[900px] w-full text-left">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-3">
                        Version
                      </th>

                      <th className="px-4 py-3">
                        File
                      </th>

                      <th className="px-4 py-3">
                        Uploaded
                      </th>

                      <th className="px-4 py-3">
                        State
                      </th>

                      <th className="px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {versions.map(
                      version => {
                        const archived =
                          version
                            .lifecycle
                            ?.archived ===
                          true;

                        return (
                          <tr
                            key={
                              version._id
                            }
                            className="align-top"
                          >
                            <td className="px-4 py-3">
                              <p className="text-[11px] font-bold text-slate-800">
                                Version{" "}
                                {
                                  version.version
                                }
                              </p>

                              {version.isCurrent &&
                                !archived && (
                                <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-700">
                                  Current
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <p className="max-w-[260px] truncate text-[10px] font-semibold text-slate-700">
                                {
                                  version.file
                                    ?.originalFileName ||
                                  version.title ||
                                  "Document"
                                }
                              </p>

                              {version.title && (
                                <p className="mt-1 max-w-[260px] truncate text-[9px] text-slate-400">
                                  {
                                    version.title
                                  }
                                </p>
                              )}
                            </td>

                            <td className="px-4 py-3 text-[10px] text-slate-500">
                              {
                                formatDate(
                                  version.uploadedAt ||
                                  version.createdAt ||
                                  null
                                )
                              }
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={
                                  `inline-flex rounded-full px-2 py-1 text-[8px] font-bold ${
                                    archived
                                      ? "bg-slate-100 text-slate-500"
                                      : version.isCurrent
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-amber-50 text-amber-700"
                                  }`
                                }
                              >
                                {
                                  archived
                                    ? "Archived"
                                    : version.isCurrent
                                      ? "Current"
                                      : "Historical"
                                }
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex min-w-[300px] flex-wrap gap-2">
                                {!archived && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={
                                        busy
                                      }
                                      onClick={() =>
                                        openVersion(
                                          versionOwner
                                            .applicant
                                            .id,
                                          version
                                        )
                                      }
                                      className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[9px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                                    >
                                      Open
                                    </button>

                                    <button
                                      type="button"
                                      disabled={
                                        busy
                                      }
                                      onClick={() =>
                                        void downloadVersion(
                                          versionOwner
                                            .applicant
                                            .id,
                                          version
                                        )
                                      }
                                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                    >
                                      Download
                                    </button>
                                  </>
                                )}

                                {version.isCurrent &&
                                  !archived && (
                                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[9px] font-bold text-indigo-700 hover:bg-indigo-100">
                                    <Upload className="h-3 w-3" />

                                    Replace

                                    <input
                                      type="file"
                                      disabled={
                                        busy
                                      }
                                      className="hidden"
                                      onChange={
                                        event => {
                                          const file =
                                            event
                                              .currentTarget
                                              .files?.[0];

                                          event
                                            .currentTarget
                                            .value =
                                            "";

                                          if (file) {
                                            void replaceVersion(
                                              versionOwner
                                                .applicant
                                                .id,
                                              version,
                                              file
                                            );
                                          }
                                        }
                                      }
                                    />
                                  </label>
                                )}

                                {!version.isCurrent &&
                                  !archived && (
                                  <button
                                    type="button"
                                    disabled={
                                      busy
                                    }
                                    onClick={() =>
                                      void setVersionCurrent(
                                        versionOwner
                                          .applicant
                                          .id,
                                        version
                                      )
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[9px] font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                                  >
                                    <Star className="h-3 w-3" />
                                    Set Current
                                  </button>
                                )}

                                {archived ? (
                                  <button
                                    type="button"
                                    disabled={
                                      busy
                                    }
                                    onClick={() =>
                                      void restoreVersion(
                                        versionOwner
                                          .applicant
                                          .id,
                                        version
                                      )
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[9px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    Restore
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={
                                      busy
                                    }
                                    onClick={() =>
                                      void archiveVersion(
                                        versionOwner
                                          .applicant
                                          .id,
                                        version
                                      )
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[9px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40"
                                  >
                                    <Archive className="h-3 w-3" />
                                    Archive
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
