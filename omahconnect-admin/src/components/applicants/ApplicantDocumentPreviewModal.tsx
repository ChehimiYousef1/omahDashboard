import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Download,
  X,
} from "lucide-react";

import {
  downloadApplicantDocumentFile,
  fetchApplicantDocumentBlob,
  type ApplicantDocument,
} from "../../services/api";

interface Props {
  applicantId: string;
  document: ApplicantDocument;
  onClose: () => void;
}

export function ApplicantDocumentPreviewModal({
  applicantId,
  document,
  onClose,
}: Props) {
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [url, setUrl] =
    useState<string | null>(null);

  const container =
    useRef<HTMLDivElement | null>(
      null
    );

  const fileName =
    document.file.originalFileName || "";

  const mime =
    (
      document.file.mimeType || ""
    ).toLowerCase();

  const isPdf =
    mime === "application/pdf" ||
    fileName
      .toLowerCase()
      .endsWith(".pdf");

  const isImage =
    mime.startsWith("image/") ||
    /\.(png|jpe?g)$/i.test(
      fileName
    );

  const isDocx =
    mime.includes(
      "wordprocessingml"
    ) ||
    fileName
      .toLowerCase()
      .endsWith(".docx");

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null =
      null;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const blob =
          await fetchApplicantDocumentBlob(
            applicantId,
            document._id
          );

        if (cancelled) return;

        if (isPdf || isImage) {
          objectUrl =
            URL.createObjectURL(blob);

          setUrl(objectUrl);
          return;
        }

        if (isDocx) {
          if (!container.current) {
            throw new Error(
              "Preview container unavailable."
            );
          }

          const { renderAsync } =
            await import(
              "docx-preview"
            );

          await renderAsync(
            blob,
            container.current
          );

          return;
        }

        setError(
          "Preview is not supported for this file type."
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Unable to preview document."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(
          objectUrl
        );
      }

      container.current
        ?.replaceChildren();
    };
  }, [
    applicantId,
    document._id,
    isPdf,
    isImage,
    isDocx,
  ]);

  async function download() {
    await downloadApplicantDocumentFile(
      applicantId,
      document._id,
      fileName
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {document.title ||
                "CV / Resume"}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {fileName}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                void download()
              }
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white"
            >
              <Download className="h-4 w-4" />
              Download
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 p-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4">

          {loading && (
            <div className="p-10 text-center text-sm text-slate-500">
              Loading document...
            </div>
          )}

          {!loading &&
            error && (
            <div className="p-10 text-center text-sm text-rose-600">
              {error}
            </div>
          )}

          {isPdf &&
            url && (
            <iframe
              src={url}
              title={fileName}
              className="h-full min-h-[75vh] w-full rounded-xl bg-white"
            />
          )}

          {isImage &&
            url && (
            <div className="flex justify-center">
              <img
                src={url}
                alt={fileName}
                className="max-h-[75vh] max-w-full object-contain"
              />
            </div>
          )}

          {isDocx && (
            <div className="mx-auto max-w-5xl rounded-xl bg-white p-4 shadow">
              <div ref={container} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
