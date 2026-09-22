import {
  useState,
} from "react";

import {
  Download,
  FileText,
  Loader2,
} from "lucide-react";

import {
  downloadApplicantRecruitmentReport,
  downloadApplicantSummaryReport,
  type ApplicantReportExportKind,
} from "../../services/api";


interface ApplicantReportExportActionsProps {
  applicantId: string;
}


function reportExportErrorMessage(
  error: unknown
): string {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Unable to export the report. Please try again.";
}


export function ApplicantReportExportActions({
  applicantId,
}: ApplicantReportExportActionsProps) {
  const [
    downloading,
    setDownloading,
  ] =
    useState<
      ApplicantReportExportKind |
      null
    >(null);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );


  async function exportReport(
    kind: ApplicantReportExportKind
  ) {
    if (downloading) {
      return;
    }

    setDownloading(
      kind
    );

    setError(
      null
    );

    try {
      if (
        kind ===
        "summary"
      ) {
        await downloadApplicantSummaryReport(
          applicantId
        );
      } else {
        await downloadApplicantRecruitmentReport(
          applicantId
        );
      }
    } catch (
      exportError
    ) {
      console.error(
        "Applicant report export failed:",
        exportError
      );

      setError(
        reportExportErrorMessage(
          exportError
        )
      );
    } finally {
      setDownloading(
        null
      );
    }
  }


  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() =>
            void exportReport(
              "summary"
            )
          }
          disabled={
            downloading !==
            null
          }
          title="Export Applicant Summary PDF"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ===
          "summary" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileText className="h-3.5 w-3.5" />
          )}

          <span>
            {downloading ===
            "summary"
              ? "Exporting..."
              : "Summary PDF"}
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            void exportReport(
              "recruitment"
            )
          }
          disabled={
            downloading !==
            null
          }
          title="Export Recruitment Report PDF"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ===
          "recruitment" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}

          <span>
            {downloading ===
            "recruitment"
              ? "Exporting..."
              : "Recruitment PDF"}
          </span>
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="max-w-sm text-right text-[10px] font-medium text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}
