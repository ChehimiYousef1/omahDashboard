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
      'FORM_DOCUMENT_MANAGED_COPY_REQUIRED',
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

function documentRequestActor(
  req
) {
  return {
    userId:
      String(
        req?.user?.id ??
        ''
      ).trim(),

    name:
      String(
        req?.user?.name ??
        req?.user?.email ??
        ''
      ).trim(),

    email:
      String(
        req?.user?.email ??
        ''
      ).trim(),

    role:
      String(
        req?.user?.role ??
        ''
      ).trim(),
  };
}


async function recordDocumentActivitySafely({
  recordActivity,
  logger = console,
  ...payload
}) {
  if (
    typeof recordActivity !==
      'function'
  ) {
    return false;
  }

  try {
    await recordActivity(
      payload
    );

    return true;
  } catch (error) {
    logger?.error?.(
      'Applicant document activity logging failed:',
      error
    );

    return false;
  }
}


function cleanDocumentAuditText(
  value
) {
  return String(
    value ?? ''
  ).trim();
}


function documentAuditMetadata(
  document
) {
  const version =
    Number(
      document?.version
    );

  return {
    documentType:
      cleanDocumentAuditText(
        document?.documentType
      ),

    version:
      Number.isFinite(
        version
      )
        ? version
        : null,

    source:
      cleanDocumentAuditText(
        document?.source
      ),
  };
}


module.exports =
function createApplicantDocumentRouter({
  requireApplicantPermission,

  recordActivity =
    null,

  activityLogger =
    console,

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

        await recordDocumentActivitySafely({
          recordActivity,

          logger:
            activityLogger,

          applicantId:
            req.params
              .applicantId,

          type:
            'document.uploaded',

          title:
            'Applicant document uploaded',

          occurredAt:
            document
              ?.uploadedAt ||
            new Date(),

          actor:
            documentRequestActor(
              req
            ),

          source: {
            type:
              'document',

            id:
              cleanDocumentAuditText(
                document?._id
              ),
          },

          changes: [
            {
              field:
                'document.exists',

              label:
                'Document exists',

              before:
                false,

              after:
                true,
            },
          ],

          metadata:
            documentAuditMetadata(
              document
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

        const nextVersion =
          Number(
            document
              ?.version
          );

        const previousVersion =
          Number.isFinite(
            nextVersion
          ) &&
          nextVersion >
            1
            ? nextVersion -
              1
            : null;


        await recordDocumentActivitySafely({
          recordActivity,

          logger:
            activityLogger,

          applicantId:
            req.params
              .applicantId,

          type:
            'document.replaced',

          title:
            'Applicant document replaced',

          occurredAt:
            document
              ?.uploadedAt ||
            new Date(),

          actor:
            documentRequestActor(
              req
            ),

          source: {
            type:
              'document',

            id:
              cleanDocumentAuditText(
                document?._id
              ),
          },

          changes: [
            {
              field:
                'document.version',

              label:
                'Document version',

              before:
                previousVersion,

              after:
                Number.isFinite(
                  nextVersion
                )
                  ? nextVersion
                  : null,
            },

            {
              field:
                'document.currentDocumentId',

              label:
                'Current document version',

              before:
                cleanDocumentAuditText(
                  req.params
                    .documentId
                ),

              after:
                cleanDocumentAuditText(
                  document?._id
                ),
            },
          ],

          metadata:
            documentAuditMetadata(
              document
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

