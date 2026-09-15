import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Archive,
  Download,
  Eye,
  FileText,
  History,
  RefreshCcw,
  RotateCcw,
  Star,
  Upload,
} from "lucide-react";

import {
  applicantDocumentDownloadUrl,
  archiveApplicantDocumentRecord,
  downloadApplicantDocumentFile,
  fetchApplicantDocuments,
  fetchApplicantDocumentVersions,
  restoreApplicantDocumentRecord,
  setApplicantDocumentCurrent,
  uploadApplicantDocument,
  uploadApplicantDocumentVersion,
  type ApplicantDocument,
  type ApplicantDocumentType,
} from "../../services/api";

import {
  ApplicantDocumentPreviewModal,
} from "./ApplicantDocumentPreviewModal";

import {
  ApplicantFormDocumentsSection,
} from "./ApplicantFormDocumentsSection";

interface ApplicantDocumentsPanelProps {
  applicantId: string;
}

const documentTypes: Array<{
  value: ApplicantDocumentType;
  label: string;
}> = [
  {
    value: "cv",
    label: "CV / Resume",
  },
  {
    value: "cover_letter",
    label: "Cover Letter",
  },
  {
    value: "certificate",
    label: "Certificate",
  },
  {
    value: "transcript",
    label: "Transcript",
  },
  {
    value: "portfolio",
    label: "Portfolio",
  },
  {
    value: "identity_document",
    label: "Identity Document",
  },
  {
    value: "other",
    label: "Other",
  },
];

function errorMessage(
  error: unknown
): string {
  if (
    error &&
    typeof error === "object" &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            error?: string;
          };
        };
      }
    ).response;

    if (response?.data?.error) {
      return response.data.error;
    }
  }

  return error instanceof Error
    ? error.message
    : "Unexpected document error.";
}

function documentTypeLabel(
  type: ApplicantDocumentType
): string {
  return (
    documentTypes.find(
      (item) =>
        item.value === type
    )?.label || type
  );
}

function formatFileSize(
  size: number
): string {
  if (
    !Number.isFinite(size) ||
    size <= 0
  ) {
    return "Size unavailable";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (
    size <
    1024 * 1024
  ) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function formatDate(
  value?: string
): string {
  if (!value) {
    return "Date unavailable";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Date unavailable";
  }

  return date.toLocaleString();
}


function isUnavailableFormExternalDocument(
  item:
    ApplicantDocument
) {
  return (
    item.source ===
      "form_submission" &&
    item.storage.provider ===
      "external"
  );
}


export function ApplicantDocumentsPanel({
  applicantId,
}: ApplicantDocumentsPanelProps) {
  const [
    documents,
    setDocuments,
  ] =
    useState<
      ApplicantDocument[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    includeArchived,
    setIncludeArchived,
  ] =
    useState(false);

  const [
    documentType,
    setDocumentType,
  ] =
    useState<
      ApplicantDocumentType
    >("cv");

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    fileInputKey,
    setFileInputKey,
  ] =
    useState(0);

  const [
    expandedGroup,
    setExpandedGroup,
  ] =
    useState<string | null>(
      null
    );

  const [
    histories,
    setHistories,
  ] =
    useState<
      Record<
        string,
        ApplicantDocument[]
      >
    >({});

  const [
    previewDocument,
    setPreviewDocument,
  ] =
    useState<
      ApplicantDocument |
      null
    >(null);

  async function loadDocuments() {
    try {
      setLoading(true);
      setError("");

      const result =
        await fetchApplicantDocuments(
          applicantId,
          includeArchived
        );

      setDocuments(result);
    } catch (loadError) {
      setError(
        errorMessage(
          loadError
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(
    () => {
      void loadDocuments();
    },
    [
      applicantId,
      includeArchived,
    ]
  );

  const groups =
    useMemo(
      () => {
        const grouped =
          new Map<
            string,
            ApplicantDocument[]
          >();

        for (
          const item
          of documents
        ) {
          const existing =
            grouped.get(
              item.documentGroupId
            ) || [];

          existing.push(item);

          grouped.set(
            item.documentGroupId,
            existing
          );
        }

        return Array.from(
          grouped.entries()
        ).map(
          ([
            groupId,
            versions,
          ]) => {
            const sorted =
              [...versions].sort(
                (
                  left,
                  right
                ) =>
                  right.version -
                  left.version
              );

            const current =
              sorted.find(
                (item) =>
                  item.isCurrent &&
                  !item.lifecycle
                    .archived
              );

            const active =
              sorted.find(
                (item) =>
                  !item.lifecycle
                    .archived
              );

            return {
              groupId,
              versions: sorted,
              primary:
                current ||
                active ||
                sorted[0],
            };
          }
        );
      },
      [documents]
    );

  async function refresh() {
    setExpandedGroup(
      null
    );

    setHistories({});

    await loadDocuments();
  }

  async function handleUpload() {
    if (!selectedFile) {
      window.alert(
        "Choose a document file first."
      );

      return;
    }

    try {
      setBusy(true);

      await uploadApplicantDocument(
        applicantId,
        {
          documentType,
          title:
            title.trim() ||
            undefined,
          file:
            selectedFile,
        }
      );

      setTitle("");
      setSelectedFile(
        null
      );

      setFileInputKey(
        (value) =>
          value + 1
      );

      await refresh();

      window.alert(
        "Document uploaded successfully."
      );
    } catch (uploadError) {
      window.alert(
        errorMessage(
          uploadError
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function replaceDocument(
    item:
      ApplicantDocument,
    file: File
  ) {
    if (
      !item.isCurrent ||
      item.lifecycle.archived
    ) {
      window.alert(
        "Only the active current version can be replaced."
      );

      return;
    }

    try {
      setBusy(true);

      await uploadApplicantDocumentVersion(
        applicantId,
        item._id,
        file,
        item.title ||
          undefined
      );

      await refresh();

      window.alert(
        "New document version created successfully."
      );
    } catch (replaceError) {
      window.alert(
        errorMessage(
          replaceError
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleVersions(
    item:
      ApplicantDocument
  ) {
    const groupId =
      item.documentGroupId;

    if (
      expandedGroup ===
      groupId
    ) {
      setExpandedGroup(
        null
      );

      return;
    }

    try {
      setBusy(true);

      const versions =
        await fetchApplicantDocumentVersions(
          applicantId,
          item._id
        );

      setHistories(
        (current) => ({
          ...current,
          [groupId]:
            versions,
        })
      );

      setExpandedGroup(
        groupId
      );
    } catch (historyError) {
      window.alert(
        errorMessage(
          historyError
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function makeCurrent(
    item:
      ApplicantDocument
  ) {
    if (
      item.lifecycle.archived ||
      item.isCurrent
    ) {
      return;
    }

    if (
      !window.confirm(
        `Set version ${item.version} as the current document version?`
      )
    ) {
      return;
    }

    try {
      setBusy(true);

      await setApplicantDocumentCurrent(
        applicantId,
        item._id
      );

      await refresh();
    } catch (currentError) {
      window.alert(
        errorMessage(
          currentError
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function archiveDocument(
    item:
      ApplicantDocument
  ) {
    if (
      !window.confirm(
        "Archive this document version? Its history will remain preserved."
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
      setBusy(true);

      await archiveApplicantDocumentRecord(
        applicantId,
        item._id,
        reason
      );

      await refresh();
    } catch (archiveError) {
      window.alert(
        errorMessage(
          archiveError
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function restoreDocument(
    item:
      ApplicantDocument
  ) {
    if (
      !window.confirm(
        "Restore this version? Restoring it will not automatically make it current."
      )
    ) {
      return;
    }

    try {
      setBusy(true);

      await restoreApplicantDocumentRecord(
        applicantId,
        item._id
      );

      await refresh();
    } catch (restoreError) {
      window.alert(
        errorMessage(
          restoreError
        )
      );
    } finally {
      setBusy(false);
    }
  }

  function openDocument(
    item:
      ApplicantDocument
  ) {
    window.open(
      applicantDocumentDownloadUrl(
        applicantId,
        item._id
      ),
      "_blank",
      "noopener,noreferrer"
    );
  }

  function viewDocument(
    item:
      ApplicantDocument
  ) {
    if (
      isUnavailableFormExternalDocument(
        item
      )
    ) {
      window.alert(
        "This Form document does not have an OMAH-managed copy yet. Replace it with a recovered file to make it available."
      );

      return;
    }

    /*
     * External Form documents must not be fetched
     * as Blobs through Axios because their backend
     * download endpoint redirects cross-origin.
     *
     * Open through the protected backend route
     * instead.
     */
    if (
      item.storage.provider ===
      "external"
    ) {
      openDocument(item);
      return;
    }

    setPreviewDocument(item);
  }

  async function downloadDocument(
    item:
      ApplicantDocument
  ) {
    if (
      isUnavailableFormExternalDocument(
        item
      )
    ) {
      window.alert(
        "This Form document does not have an OMAH-managed copy yet."
      );

      return;
    }

    try {
      setBusy(true);

      await downloadApplicantDocumentFile(
        applicantId,
        item._id,
        item.file.originalFileName
      );
    } catch (error) {
      window.alert(
        errorMessage(error)
      );
    } finally {
      setBusy(false);
    }
  }

  function renderVersionActions(
    item:
      ApplicantDocument
  ) {
    return (
      <div className="flex flex-wrap gap-2">
        {!item.lifecycle
          .archived && (
          <button
            type="button"
            disabled={busy || isUnavailableFormExternalDocument(item)}
            onClick={() =>
              openDocument(
                item
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Open
          </button>
        )}

        {!item.isCurrent &&
          !item.lifecycle
            .archived && (
          <button
            type="button"
            disabled={busy || isUnavailableFormExternalDocument(item)}
            onClick={() =>
              void makeCurrent(
                item
              )
            }
            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[9px] font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-40"
          >
            Set Current
          </button>
        )}

        {item.lifecycle
          .archived ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void restoreDocument(
                item
              )
            }
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[9px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
          >
            Restore
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void archiveDocument(
                item
              )
            }
            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[9px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40"
          >
            Archive
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <FileText className="h-4 w-4 text-blue-600" />
            Managed Documents
          </h3>

          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Upload and manage private Applicant files. Replacing a file creates a new immutable version instead of overwriting previous history.
          </p>
        </div>

        <button
          type="button"
          disabled={
            busy ||
            loading
          }
          onClick={() =>
            void refresh()
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="mt-5 grid gap-3 rounded-xl border border-blue-100 bg-white p-4 lg:grid-cols-[180px_1fr_1fr_auto]">
        <select
          value={
            documentType
          }
          disabled={busy}
          onChange={(
            event
          ) =>
            setDocumentType(
              event.target
                .value as
                ApplicantDocumentType
            )
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"
        >
          {documentTypes.map(
            (type) => (
              <option
                key={
                  type.value
                }
                value={
                  type.value
                }
              >
                {
                  type.label
                }
              </option>
            )
          )}
        </select>

        <input
          type="text"
          value={title}
          disabled={busy}
          maxLength={200}
          placeholder="Optional document title"
          onChange={(
            event
          ) =>
            setTitle(
              event.target
                .value
            )
          }
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400"
        />

        <input
          key={fileInputKey}
          type="file"
          disabled={busy}
          accept=".pdf,.docx,.jpg,.jpeg,.png"
          onChange={(
            event
          ) =>
            setSelectedFile(
              event.target
                .files?.[0] ||
                null
            )
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-[11px] file:font-bold"
        />

        <button
          type="button"
          disabled={
            busy ||
            !selectedFile
          }
          onClick={() =>
            void handleUpload()
          }
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-slate-400">
          PDF, DOCX, JPEG or PNG · Maximum 10 MB
        </p>

        <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <input
            type="checkbox"
            checked={
              includeArchived
            }
            onChange={(
              event
            ) =>
              setIncludeArchived(
                event.target
                  .checked
              )
            }
          />
          Show archived versions
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-5 text-xs text-slate-400">
          Loading managed documents...
        </p>
      ) : groups.length ===
        0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <FileText className="mx-auto h-7 w-7 text-slate-300" />

          <p className="mt-2 text-xs font-semibold text-slate-600">
            No managed documents yet.
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Original Form submission documents are shown in the section below.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {groups.map(
            ({
              groupId,
              primary,
            }) => {
              const history =
                histories[
                  groupId
                ] || [];

              return (
                <div
                  key={groupId}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold text-slate-900">
                          {primary.title ||
                            documentTypeLabel(
                              primary.documentType
                            )}
                        </p>

                        {primary.isCurrent &&
                          !primary.lifecycle.archived && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                            Current
                          </span>
                        )}

                        {primary.lifecycle.archived && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                            Archived
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-[11px] text-slate-500">
                        {primary.file.originalFileName ||
                          "Document"}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
                        <span>
                          {
                            documentTypeLabel(
                              primary.documentType
                            )
                          }
                        </span>

                        <span>
                          Version{" "}
                          {
                            primary.version
                          }
                        </span>

                        <span>
                          {
                            formatFileSize(
                              primary.file.sizeBytes
                            )
                          }
                        </span>

                        <span className="uppercase">
                          {
                            primary.storage.provider
                          }
                        </span>

                        <span>
                          {
                            formatDate(
                              primary.uploadedAt
                            )
                          }
                        </span>
                      </div>

                      {primary.lifecycle.archiveReason && (
                        <p className="mt-2 text-[10px] text-rose-500">
                          Archive reason:{" "}
                          {
                            primary.lifecycle.archiveReason
                          }
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!primary.lifecycle.archived && (
                        <>
                          <button
                            type="button"
                            disabled={busy || isUnavailableFormExternalDocument(primary)}
                            onClick={() =>
                              viewDocument(
                                primary
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>

                          <button
                            type="button"
                            disabled={busy || isUnavailableFormExternalDocument(primary)}
                            onClick={() =>
                              void downloadDocument(
                                primary
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void toggleVersions(
                            primary
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <History className="h-3.5 w-3.5" />
                        Versions
                      </button>

                      {primary.isCurrent &&
                        !primary.lifecycle.archived && (
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-bold text-blue-700 hover:bg-blue-100">
                          <Upload className="h-3.5 w-3.5" />
                          Replace

                          <input
                            type="file"
                            className="hidden"
                            disabled={busy}
                            accept=".pdf,.docx,.jpg,.jpeg,.png"
                            onChange={(
                              event
                            ) => {
                              const file =
                                event.target
                                  .files?.[0];

                              event.target.value =
                                "";

                              if (file) {
                                void replaceDocument(
                                  primary,
                                  file
                                );
                              }
                            }}
                          />
                        </label>
                      )}

                      {!primary.isCurrent &&
                        !isUnavailableFormExternalDocument(primary) &&
                        !primary.lifecycle.archived && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void makeCurrent(
                              primary
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                        >
                          <Star className="h-3.5 w-3.5" />
                          Set Current
                        </button>
                      )}

                      {primary.lifecycle.archived ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void restoreDocument(
                              primary
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void archiveDocument(
                              primary
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          Archive
                        </button>
                      )}
                    </div>
                  </div>

                  {expandedGroup ===
                    groupId && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Version History
                      </p>

                      {history.length ===
                      0 ? (
                        <p className="text-xs text-slate-400">
                          No versions found.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {history.map(
                            (
                              version
                            ) => (
                              <div
                                key={
                                  version._id
                                }
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                              >
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-bold text-slate-700">
                                      Version{" "}
                                      {
                                        version.version
                                      }
                                    </span>

                                    {version.isCurrent &&
                                      !version.lifecycle.archived && (
                                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-bold uppercase text-emerald-700">
                                        Current
                                      </span>
                                    )}

                                    {version.lifecycle.archived && (
                                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[8px] font-bold uppercase text-slate-500">
                                        Archived
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-1 text-[10px] text-slate-400">
                                    {
                                      version.file.originalFileName
                                    }{" "}
                                    ·{" "}
                                    {
                                      formatFileSize(
                                        version.file.sizeBytes
                                      )
                                    }
                                  </p>
                                </div>

                                {
                                  renderVersionActions(
                                    version
                                  )
                                }
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}

      <ApplicantFormDocumentsSection
        applicantId={
          applicantId
        }

        managedDocuments={
          documents
        }
      />

      {previewDocument && (
        <ApplicantDocumentPreviewModal
          applicantId={applicantId}
          document={previewDocument}
          onClose={() =>
            setPreviewDocument(null)
          }
        />
      )}
    </div>
  );
}
