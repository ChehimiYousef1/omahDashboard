import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Download,
  ExternalLink,
  X,
} from "lucide-react";

import {
  applicantDocumentDownloadUrl,
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
  const provider =
    document.storage.provider;

  const isExternal =
    provider === "external";

  const isS3 =
    provider === "s3";


  const [loading, setLoading] =
    useState(
      !isExternal &&
      !isS3
    );

  const [error, setError] =
    useState("");

  const [url, setUrl] =
    useState<string | null>(
      null
    );


  const container =
    useRef<HTMLDivElement | null>(
      null
    );


  const fileName =
    document.file
      .originalFileName ||
    "";

  const mime =
    (
      document.file.mimeType ||
      ""
    ).toLowerCase();


  const isPdf =
    mime ===
      "application/pdf" ||
    fileName
      .toLowerCase()
      .endsWith(
        ".pdf"
      );

  const isImage =
    mime.startsWith(
      "image/"
    ) ||
    /\.(png|jpe?g)$/i.test(
      fileName
    );

  const isDocx =
    mime.includes(
      "wordprocessingml"
    ) ||
    fileName
      .toLowerCase()
      .endsWith(
        ".docx"
      );


  const protectedUrl =
    applicantDocumentDownloadUrl(
      applicantId,
      document._id
    );


  /*
   * Local documents can safely be fetched through
   * the API as Blob data.
   *
   * S3 and external documents may redirect to
   * another origin. They must never be loaded
   * through Axios because the redirect can fail
   * browser CORS checks.
   */
  useEffect(
    () => {
      let cancelled =
        false;

      let objectUrl:
        string |
        null =
        null;


      async function load() {
        if (
          isExternal
        ) {
          setLoading(
            false
          );

          setError("");

          setUrl(
            null
          );

          return;
        }


        /*
         * S3 PDF/image preview can use the protected
         * endpoint directly. The browser follows the
         * signed-URL redirect without an XHR CORS
         * request.
         */
        if (isS3) {
          setLoading(
            false
          );

          setError("");

          if (
            isPdf ||
            isImage
          ) {
            setUrl(
              protectedUrl
            );
          } else {
            setUrl(
              null
            );
          }

          return;
        }


        try {
          setLoading(
            true
          );

          setError("");

          const blob =
            await fetchApplicantDocumentBlob(
              applicantId,
              document._id
            );


          if (
            cancelled
          ) {
            return;
          }


          if (
            isPdf ||
            isImage
          ) {
            objectUrl =
              URL.createObjectURL(
                blob
              );

            setUrl(
              objectUrl
            );

            return;
          }


          if (isDocx) {
            if (
              !container.current
            ) {
              throw new Error(
                "Preview container unavailable."
              );
            }

            const {
              renderAsync,
            } =
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
        } catch (previewError) {
          if (
            cancelled
          ) {
            return;
          }

          setError(
            previewError instanceof
              Error
              ? previewError.message
              : "Unable to preview document."
          );
        } finally {
          if (
            !cancelled
          ) {
            setLoading(
              false
            );
          }
        }
      }


      void load();


      return () => {
        cancelled =
          true;

        if (objectUrl) {
          URL.revokeObjectURL(
            objectUrl
          );
        }

        container.current
          ?.replaceChildren();
      };
    },
    [
      applicantId,
      document._id,
      isExternal,
      isS3,
      isPdf,
      isImage,
      isDocx,
      protectedUrl,
    ]
  );


  function openOriginal() {
    window.open(
      protectedUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }


  async function download() {
    /*
     * Remote providers are intentionally opened
     * through the authenticated backend endpoint.
     *
     * This avoids Axios following a cross-origin
     * redirect and producing "Network Error".
     */
    if (
      isExternal ||
      isS3
    ) {
      openOriginal();
      return;
    }

    await downloadApplicantDocumentFile(
      applicantId,
      document._id,
      fileName
    );
  }


  const remoteUnsupported =
    isS3 &&
    !isPdf &&
    !isImage;


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900">
              {document.title ||
                "Applicant Document"}
            </h2>

            <p className="mt-1 truncate text-xs text-slate-500">
              {fileName ||
                (
                  isExternal
                    ? "External Form document"
                    : "Document"
                )}
            </p>
          </div>


          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                void download()
              }
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
            >
              {
                isExternal ||
                isS3
                  ? (
                    <ExternalLink className="h-4 w-4" />
                  )
                  : (
                    <Download className="h-4 w-4" />
                  )
              }

              {
                isExternal
                  ? "Open Original"
                  : isS3
                    ? "Open Document"
                    : "Download"
              }
            </button>


            <button
              type="button"
              onClick={
                onClose
              }
              className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
              aria-label="Close document preview"
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
            <div className="rounded-xl border border-rose-200 bg-white p-10 text-center">
              <p className="text-sm font-semibold text-rose-600">
                {error}
              </p>

              <button
                type="button"
                onClick={
                  openOriginal
                }
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                Open document
              </button>
            </div>
          )}


          {isExternal && (
            <div className="flex min-h-[65vh] items-center justify-center">
              <div className="max-w-lg rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm">
                <ExternalLink className="mx-auto h-9 w-9 text-blue-500" />

                <h3 className="mt-4 text-sm font-bold text-slate-900">
                  Original Form document
                </h3>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  This file is stored externally, such as in Google Drive.
                  Open the original document to view it securely. Access may
                  depend on the permissions of the original file.
                </p>

                <button
                  type="button"
                  onClick={
                    openOriginal
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Original Document
                </button>
              </div>
            </div>
          )}


          {remoteUnsupported && (
            <div className="flex min-h-[65vh] items-center justify-center">
              <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <ExternalLink className="mx-auto h-9 w-9 text-slate-400" />

                <h3 className="mt-4 text-sm font-bold text-slate-900">
                  Remote document
                </h3>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  In-browser preview is not available for this remote file
                  type. Open the document using the protected document link.
                </p>

                <button
                  type="button"
                  onClick={
                    openOriginal
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Document
                </button>
              </div>
            </div>
          )}


          {!isExternal &&
            isPdf &&
            url && (
            <iframe
              src={url}
              title={
                fileName ||
                "PDF document"
              }
              className="h-full min-h-[75vh] w-full rounded-xl bg-white"
            />
          )}


          {!isExternal &&
            isImage &&
            url && (
            <div className="flex justify-center">
              <img
                src={url}
                alt={
                  fileName ||
                  "Applicant document"
                }
                className="max-h-[75vh] max-w-full object-contain"
              />
            </div>
          )}


          {!isExternal &&
            !isS3 &&
            isDocx && (
            <div className="mx-auto max-w-5xl rounded-xl bg-white p-4 shadow">
              <div
                ref={
                  container
                }
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
