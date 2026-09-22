'use strict';

const express =
  require('express');

const {
  buildApplicantSummaryReport,
} = require(
  '../../services/applicantReportService'
);

const {
  renderApplicantSummaryPdf,
} = require(
  '../../services/applicantPdfRenderer'
);


const {
  buildApplicantRecruitmentReport,
} = require(
  '../../services/applicantRecruitmentReportService'
);

const {
  renderApplicantRecruitmentPdf,
} = require(
  '../../services/applicantRecruitmentPdfRenderer'
);


function cleanText(
  value
) {
  return String(
    value ?? ''
  ).trim();
}


function generatedBy(
  user
) {
  return {
    name:
      cleanText(
        user?.name
      ),

    role:
      cleanText(
        user?.role
      ),
  };
}


function reportFileName(
  report
) {
  const rawName =
    cleanText(
      report
        ?.identity
        ?.fullName
    ) ||
    'applicant';

  const slug =
    rawName
      .normalize('NFKD')
      .replace(
        /[^\x00-\x7F]/g,
        ''
      )
      .replace(
        /[^a-zA-Z0-9]+/g,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        ''
      )
      .toLowerCase() ||
    'applicant';

  const date =
    cleanText(
      report
        ?.report
        ?.generatedAt
    )
      .slice(0, 10) ||
    'report';

  return (
    `omah-applicant-summary-${slug}-${date}.pdf`
  );
}


function sendReportError(
  res,
  error
) {
  if (
    error?.code ===
      'INVALID_APPLICANT_ID'
  ) {
    return res
      .status(400)
      .json({
        success: false,
        code:
          error.code,
        error:
          error.message,
      });
  }

  if (
    error?.code ===
      'APPLICANT_NOT_FOUND'
  ) {
    return res
      .status(404)
      .json({
        success: false,
        code:
          error.code,
        error:
          error.message,
      });
  }

  return res
    .status(500)
    .json({
      success: false,
      code:
        'APPLICANT_REPORT_FAILED',
      error:
        'Applicant report could not be generated.',
    });
}


function createApplicantReportRouter({
  requireApplicantPermission,

  services = {},
} = {}) {
  if (
    typeof
      requireApplicantPermission !==
      'function'
  ) {
    throw new Error(
      'requireApplicantPermission is required'
    );
  }

  const api = {
    buildApplicantSummaryReport,
    renderApplicantSummaryPdf,
    buildApplicantRecruitmentReport,
    renderApplicantRecruitmentPdf,

    ...services,
  };

  const router =
    express.Router({
      mergeParams: true,
    });


  router.get(
    '/summary.pdf',

    requireApplicantPermission(
      'applicant:view'
    ),

    requireApplicantPermission(
      'applicant:interviews:view'
    ),

    requireApplicantPermission(
      'applicant:evaluations:view'
    ),

    async (
      req,
      res
    ) => {
      try {
        const report =
          await api
            .buildApplicantSummaryReport({
              applicantId:
                req.params
                  .applicantId,

              generatedBy:
                generatedBy(
                  req.user
                ),
            });

        const pdf =
          await api
            .renderApplicantSummaryPdf(
              report
            );

        if (
          !Buffer.isBuffer(pdf)
        ) {
          throw new Error(
            'PDF renderer returned a non-buffer result.'
          );
        }

        const filename =
          reportFileName(
            report
          );

        res.setHeader(
          'Content-Type',
          'application/pdf'
        );

        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}"`
        );

        res.setHeader(
          'Content-Length',
          String(
            pdf.length
          )
        );

        res.setHeader(
          'Cache-Control',
          'private, no-store'
        );

        return res
          .status(200)
          .end(pdf);
      } catch (error) {
        return sendReportError(
          res,
          error
        );
      }
    }
  );


  router.get(
    '/recruitment.pdf',

    requireApplicantPermission(
      'applicant:view'
    ),

    requireApplicantPermission(
      'applicant:interviews:view'
    ),

    requireApplicantPermission(
      'applicant:evaluations:view'
    ),

    async (
      req,
      res
    ) => {
      try {
        const report =
          await api
            .buildApplicantRecruitmentReport({
              applicantId:
                req.params
                  .applicantId,

              generatedBy:
                generatedBy(
                  req.user
                ),
            });

        const pdf =
          await api
            .renderApplicantRecruitmentPdf(
              report
            );

        if (
          !Buffer.isBuffer(pdf)
        ) {
          throw new Error(
            'Recruitment PDF renderer returned a non-buffer result.'
          );
        }

        const rawName =
          cleanText(
            report
              ?.candidate
              ?.fullName
          ) ||
          'applicant';

        const slug =
          rawName
            .normalize('NFKD')
            .replace(
              /[^\x00-\x7F]/g,
              ''
            )
            .replace(
              /[^a-zA-Z0-9]+/g,
              '-'
            )
            .replace(
              /^-+|-+$/g,
              ''
            )
            .toLowerCase() ||
          'applicant';

        const date =
          cleanText(
            report
              ?.report
              ?.generatedAt
          )
            .slice(0, 10) ||
          'report';

        const filename =
          `omah-recruitment-report-${slug}-${date}.pdf`;

        res.setHeader(
          'Content-Type',
          'application/pdf'
        );

        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}"`
        );

        res.setHeader(
          'Content-Length',
          String(
            pdf.length
          )
        );

        res.setHeader(
          'Cache-Control',
          'private, no-store'
        );

        return res
          .status(200)
          .end(pdf);
      } catch (error) {
        return sendReportError(
          res,
          error
        );
      }
    }
  );


  return router;
}


module.exports =
  createApplicantReportRouter;
