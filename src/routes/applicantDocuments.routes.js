'use strict';

const express =
  require('express');

const uploadApplicantDocument =
  require(
    '../../middleware/applicantDocumentUpload'
  );

const {
  actorId,
  createApplicantDocument,
  replaceApplicantDocument,
  getApplicantDocuments,
  getDocumentVersions,
  getDocumentDownload,
  setCurrentDocumentVersion,
  archiveApplicantDocument,
  restoreApplicantDocument,
} = require(
  '../../services/applicantDocumentService'
);

function statusForError(
  error
) {
  const code =
    error?.code;

  if (
    [
      'APPLICANT_NOT_FOUND',
      'DOCUMENT_NOT_FOUND',
      'CURRENT_DOCUMENT_NOT_FOUND',
      'STORAGE_OBJECT_NOT_FOUND',
    ].includes(code)
  ) {
    return 404;
  }

  if (
    [
      'DOCUMENT_VERSION_CONFLICT',
      'STORAGE_OBJECT_EXISTS',
      'EXTERNAL_STORAGE_READ_ONLY',
    ].includes(code)
  ) {
    return 409;
  }

  if (
    code ||
    error?.name ===
      'ValidationError' ||
    error?.name ===
      'CastError'
  ) {
    return 400;
  }

  return 500;
}

function sendError(
  res,
  error
) {
  const status =
    statusForError(error);

  if (status === 500) {
    console.error(
      'Applicant Document API error:',
      error
    );
  }

  return res
    .status(status)
    .json({
      success: false,

      code:
        error?.code ||
        'INTERNAL_ERROR',

      error:
        status === 500
          ? 'Internal server error'
          : error.message,
    });
}

module.exports =
function createApplicantDocumentRouter({
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
    createApplicantDocument,
    replaceApplicantDocument,
    getApplicantDocuments,
    getDocumentVersions,
    getDocumentDownload,
    setCurrentDocumentVersion,
    archiveApplicantDocument,
    restoreApplicantDocument,

    ...services,
  };

  const router =
    express.Router({
      mergeParams: true,
    });

  router.get(
    '/',

    requireApplicantPermission(
      'applicant:documents:view'
    ),

    async (
      req,
      res
    ) => {
      try {
        const documents =
          await api
            .getApplicantDocuments({
              applicantId:
                req.params
                  .applicantId,

              includeArchived:
                String(
                  req.query
                    .includeArchived ||
                    ''
                ).toLowerCase() ===
                'true',
            });

        return res.json({
          success: true,
          documents,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  router.post(
    '/',

    requireApplicantPermission(
      'applicant:documents:manage'
    ),

    uploadApplicantDocument,

    async (
      req,
      res
    ) => {
      try {
        const document =
          await api
            .createApplicantDocument({
              applicantId:
                req.params
                  .applicantId,

              documentType:
                req.body
                  ?.documentType,

              title:
                req.body
                  ?.title ||
                '',

              file:
                req.file,

              uploadedBy:
                actorId(
                  req.user
                ),
            });

        return res
          .status(201)
          .json({
            success: true,
            document,
          });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  router.post(
    '/:documentId/versions',

    requireApplicantPermission(
      'applicant:documents:manage'
    ),

    uploadApplicantDocument,

    async (
      req,
      res
    ) => {
      try {
        const document =
          await api
            .replaceApplicantDocument({
              applicantId:
                req.params
                  .applicantId,

              documentId:
                req.params
                  .documentId,

              title:
                req.body
                  ?.title,

              file:
                req.file,

              uploadedBy:
                actorId(
                  req.user
                ),
            });

        return res
          .status(201)
          .json({
            success: true,
            document,
          });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  router.get(
    '/:documentId/versions',

    requireApplicantPermission(
      'applicant:documents:view'
    ),

    async (
      req,
      res
    ) => {
      try {
        const versions =
          await api
            .getDocumentVersions({
              applicantId:
                req.params
                  .applicantId,

              documentId:
                req.params
                  .documentId,
            });

        return res.json({
          success: true,
          versions,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  router.get(
    '/:documentId/download',

    requireApplicantPermission(
      'applicant:documents:view'
    ),

    async (
      req,
      res
    ) => {
      try {
        const {
          document,
          descriptor,
        } =
          await api
            .getDocumentDownload({
              applicantId:
                req.params
                  .applicantId,

              documentId:
                req.params
                  .documentId,
            });

        if (
          descriptor.kind ===
          'local_file'
        ) {
          return res.download(
            descriptor.absolutePath,

            document.file
              ?.originalFileName ||
              'document'
          );
        }

        if (
          descriptor.kind ===
            'signed_url' ||
          descriptor.kind ===
            'external_url'
        ) {
          return res.redirect(
            302,
            descriptor.url
          );
        }

        throw new Error(
          'Unsupported download descriptor.'
        );
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  router.post(
    '/:documentId/current',

    requireApplicantPermission(
      'applicant:documents:manage'
    ),

    async (
      req,
      res
    ) => {
      try {
        const document =
          await api
            .setCurrentDocumentVersion({
              applicantId:
                req.params
                  .applicantId,

              documentId:
                req.params
                  .documentId,
            });

        return res.json({
          success: true,
          document,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  router.post(
    '/:documentId/archive',

    requireApplicantPermission(
      'applicant:documents:manage'
    ),

    async (
      req,
      res
    ) => {
      try {
        const result =
          await api
            .archiveApplicantDocument({
              applicantId:
                req.params
                  .applicantId,

              documentId:
                req.params
                  .documentId,

              archivedBy:
                actorId(
                  req.user
                ),

              reason:
                req.body
                  ?.reason ||
                '',
            });

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  router.post(
    '/:documentId/restore',

    requireApplicantPermission(
      'applicant:documents:manage'
    ),

    async (
      req,
      res
    ) => {
      try {
        const result =
          await api
            .restoreApplicantDocument({
              applicantId:
                req.params
                  .applicantId,

              documentId:
                req.params
                  .documentId,
            });

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return sendError(
          res,
          error
        );
      }
    }
  );

  return router;
};

