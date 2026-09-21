'use strict';

const crypto =
  require('crypto');

const mongoose =
  require('mongoose');

const Applicant =
  require('../models/Applicant');

const ApplicantDocument =
  require(
    '../models/ApplicantDocument'
  );

const {
  buildInitialDocumentVersion,
  buildNextDocumentVersion,
} = require(
  './applicantDocumentVersionService'
);

const {
  buildStorageKey,
} = require(
  './documentStorageService'
);

const {
  validateApplicantDocumentFile,
} = require(
  './applicantDocumentValidationService'
);

const {
  createDocumentStorageFactory,
} = require(
  './documentStorageFactory'
);

function serviceError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code = code;

  return error;
}

function toObjectId(
  value,
  fieldName
) {
  if (
    !mongoose.Types.ObjectId.isValid(
      value
    )
  ) {
    throw serviceError(
      'INVALID_OBJECT_ID',
      fieldName +
        ' must be a valid ObjectId.'
    );
  }

  return new mongoose.Types.ObjectId(
    value
  );
}

function actorId(user) {
  return String(
    user?.id ??
    user?._id ??
    ''
  ).trim();
}

function queryLean(
  query
) {
  return query.lean();
}

async function requireActiveApplicant({
  applicantId,
  ApplicantModel,
}) {
  const id =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const applicant =
    await queryLean(
      ApplicantModel
        .findOne({
          _id: id,

          'lifecycle.archived': {
            $ne: true,
          },
        })
        .select('_id')
    );

  if (!applicant) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',
      'Active Applicant was not found.'
    );
  }

  return id;
}

async function createApplicantDocument({
  applicantId,
  documentType,
  title = '',
  file,
  uploadedBy = '',
  now = new Date(),

  ApplicantModel =
    Applicant,

  DocumentModel =
    ApplicantDocument,

  storageFactory =
    createDocumentStorageFactory(),
}) {
  const applicantObjectId =
    await requireActiveApplicant({
      applicantId,
      ApplicantModel,
    });

  const validated =
    validateApplicantDocumentFile({
      file,
      documentType,
    });

  const documentGroupId =
    crypto.randomUUID();

  const storageProvider =
    storageFactory
      .getUploadProvider();

  if (
    storageProvider.provider ===
    'external'
  ) {
    throw serviceError(
      'EXTERNAL_STORAGE_READ_ONLY',
      'New uploads cannot use external storage.'
    );
  }

  const storageKey =
    buildStorageKey({
      applicantId:
        applicantObjectId.toString(),

      documentGroupId,

      version: 1,

      originalFileName:
        file.originalname,
    });

  let stored = null;

  try {
    stored =
      await storageProvider.put({
        key:
          storageKey,

        body:
          file.buffer,

        contentType:
          validated.mimeType,
      });

    const record =
      buildInitialDocumentVersion({
        applicantId:
          applicantObjectId,

        documentGroupId,

        documentType,

        title,

        file: {
          originalFileName:
            file.originalname,

          storedFileName:
            storageKey
              .split('/')
              .pop(),

          mimeType:
            validated.mimeType,

          sizeBytes:
            stored.sizeBytes,

          checksumSha256:
            stored.checksumSha256,
        },

        storage: {
          provider:
            stored.provider,

          key:
            stored.key,
        },

        source:
          'admin_upload',

        uploadedBy,

        uploadedAt:
          now,
      });

    return await DocumentModel.create(
      record
    );
  } catch (error) {
    if (
      stored &&
      storageProvider.cleanup
    ) {
      try {
        await storageProvider.cleanup({
          key:
            storageKey,
        });
      } catch (
        cleanupError
      ) {
        console.error(
          'Document upload rollback cleanup failed:',
          cleanupError.message
        );
      }
    }

    throw error;
  }
}

async function replaceApplicantDocument({
  applicantId,
  documentId,
  title,
  file,
  uploadedBy = '',
  now = new Date(),

  ApplicantModel =
    Applicant,

  DocumentModel =
    ApplicantDocument,

  storageFactory =
    createDocumentStorageFactory(),
}) {
  const applicantObjectId =
    await requireActiveApplicant({
      applicantId,
      ApplicantModel,
    });

  const documentObjectId =
    toObjectId(
      documentId,
      'documentId'
    );

  const current =
    await queryLean(
      DocumentModel.findOne({
        _id:
          documentObjectId,

        applicantId:
          applicantObjectId,

        isCurrent: true,

        'lifecycle.archived': {
          $ne: true,
        },
      })
    );

  if (!current) {
    throw serviceError(
      'CURRENT_DOCUMENT_NOT_FOUND',
      'Current Applicant document was not found.'
    );
  }

  const validated =
    validateApplicantDocumentFile({
      file,

      documentType:
        current.documentType,
    });

  const nextVersion =
    Number(
      current.version
    ) + 1;

  const storageProvider =
    storageFactory
      .getUploadProvider();

  if (
    storageProvider.provider ===
    'external'
  ) {
    throw serviceError(
      'EXTERNAL_STORAGE_READ_ONLY',
      'New uploads cannot use external storage.'
    );
  }

  const storageKey =
    buildStorageKey({
      applicantId:
        applicantObjectId.toString(),

      documentGroupId:
        current.documentGroupId,

      version:
        nextVersion,

      originalFileName:
        file.originalname,
    });

  let stored = null;
  let previousChanged =
    false;

  try {
    stored =
      await storageProvider.put({
        key:
          storageKey,

        body:
          file.buffer,

        contentType:
          validated.mimeType,
      });

    const transition =
      buildNextDocumentVersion({
        currentDocument:
          current,

        title,

        file: {
          originalFileName:
            file.originalname,

          storedFileName:
            storageKey
              .split('/')
              .pop(),

          mimeType:
            validated.mimeType,

          sizeBytes:
            stored.sizeBytes,

          checksumSha256:
            stored.checksumSha256,
        },

        storage: {
          provider:
            stored.provider,

          key:
            stored.key,
        },

        uploadedBy,

        uploadedAt:
          now,
      });

    const previousResult =
      await DocumentModel.updateOne(
        {
          _id:
            documentObjectId,

          isCurrent:
            true,

          'lifecycle.archived': {
            $ne: true,
          },
        },
        {
          $set:
            transition
              .previousVersionUpdate,
        },
        {
          runValidators:
            true,
        }
      );

    if (
      previousResult.matchedCount !==
      1
    ) {
      throw serviceError(
        'DOCUMENT_VERSION_CONFLICT',
        'Document changed while the new version was being created.'
      );
    }

    previousChanged = true;

    return await DocumentModel.create(
      transition.nextDocument
    );
  } catch (error) {
    if (previousChanged) {
      try {
        await DocumentModel.updateOne(
          {
            _id:
              documentObjectId,
          },
          {
            $set: {
              isCurrent:
                true,
            },
          }
        );
      } catch (
        rollbackError
      ) {
        console.error(
          'Document version rollback failed:',
          rollbackError.message
        );
      }
    }

    if (
      stored &&
      storageProvider.cleanup
    ) {
      try {
        await storageProvider.cleanup({
          key:
            storageKey,
        });
      } catch (
        cleanupError
      ) {
        console.error(
          'Document storage rollback failed:',
          cleanupError.message
        );
      }
    }

    throw error;
  }
}

async function getApplicantDocuments({
  applicantId,
  includeArchived =
    false,

  ApplicantModel =
    Applicant,

  DocumentModel =
    ApplicantDocument,
}) {
  const applicantObjectId =
    await requireActiveApplicant({
      applicantId,
      ApplicantModel,
    });

  const filter = {
    applicantId:
      applicantObjectId,
  };

  if (!includeArchived) {
    filter[
      'lifecycle.archived'
    ] = {
      $ne: true,
    };
  }

  return DocumentModel
    .find(filter)
    .sort({
      documentType: 1,
      documentGroupId: 1,
      version: -1,
    })
    .lean();
}

async function getDocumentVersions({
  applicantId,
  documentId,

  ApplicantModel =
    Applicant,

  DocumentModel =
    ApplicantDocument,
}) {
  const applicantObjectId =
    await requireActiveApplicant({
      applicantId,
      ApplicantModel,
    });

  const documentObjectId =
    toObjectId(
      documentId,
      'documentId'
    );

  const document =
    await queryLean(
      DocumentModel.findOne({
        _id:
          documentObjectId,

        applicantId:
          applicantObjectId,
      })
    );

  if (!document) {
    throw serviceError(
      'DOCUMENT_NOT_FOUND',
      'Applicant document was not found.'
    );
  }

  return DocumentModel
    .find({
      applicantId:
        applicantObjectId,

      documentGroupId:
        document.documentGroupId,
    })
    .sort({
      version: -1,
    })
    .lean();
}

async function getDocumentDownload({
  applicantId,
  documentId,

  ApplicantModel =
    Applicant,

  DocumentModel =
    ApplicantDocument,

  storageFactory =
    createDocumentStorageFactory(),
}) {
  const applicantObjectId =
    await requireActiveApplicant({
      applicantId,
      ApplicantModel,
    });

  const documentObjectId =
    toObjectId(
      documentId,
      'documentId'
    );

  const document =
    await queryLean(
      DocumentModel.findOne({
        _id:
          documentObjectId,

        applicantId:
          applicantObjectId,

        'lifecycle.archived': {
          $ne: true,
        },
      })
    );

  if (!document) {
    throw serviceError(
      'DOCUMENT_NOT_FOUND',
      'Active Applicant document was not found.'
    );
  }

  /*
   * Historical Google Form references are
   * provenance records only.
   *
   * Never redirect an authenticated OMAH user
   * back to the original external Form URL.
   * A usable document must first exist in
   * OMAH-managed local/S3 storage.
   */
  if (
    document.source ===
      'form_submission' &&
    document.storage
      ?.provider ===
      'external'
  ) {
    throw serviceError(
      'FORM_DOCUMENT_MANAGED_COPY_REQUIRED',
      'This historical Form document is not available in OMAH managed storage.'
    );
  }

  const provider =
    storageFactory
      .getProvider(
        document.storage.provider
      );

  const descriptor =
    document.storage.provider ===
      'external'
      ? await provider
          .getDownloadDescriptor({
            externalUrl:
              document.storage
                .externalUrl,
          })
      : await provider
          .getDownloadDescriptor({
            key:
              document.storage.key,
          });

  return {
    document,
    descriptor,
  };
}

function documentAuditId(
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (
    value &&
    typeof value.toHexString ===
      'function'
  ) {
    return String(
      value.toHexString()
    );
  }

  const text =
    String(value).trim();

  return text || null;
}


function documentAuditText(
  value
) {
  return String(
    value ?? ''
  ).trim();
}


function documentAuditVersion(
  value
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}


function documentLifecycleAuditMetadata(
  document
) {
  return {
    documentType:
      documentAuditText(
        document?.documentType
      ),

    version:
      documentAuditVersion(
        document?.version
      ),

    source:
      documentAuditText(
        document?.source
      ),
  };
}


function buildDocumentCurrentAuditChanges({
  previous,
  target,
}) {
  const before =
    documentAuditId(
      previous?._id
    );

  const after =
    documentAuditId(
      target?._id
    );

  if (before === after) {
    return [];
  }

  return [
    {
      field:
        'document.currentDocumentId',

      label:
        'Current document',

      before,

      after,
    },
  ];
}


function buildDocumentArchiveAuditChanges({
  target,
  replacementVersion,
}) {
  const changes = [
    {
      field:
        'document.archived',

      label:
        'Document archived',

      before:
        false,

      after:
        true,
    },
  ];


  if (
    target?.isCurrent ===
      true
  ) {
    changes.push({
      field:
        'document.currentDocumentId',

      label:
        'Current document',

      before:
        documentAuditId(
          target?._id
        ),

      after:
        documentAuditId(
          replacementVersion?._id
        ),
    });
  }


  return changes;
}


function buildDocumentRestoreAuditChanges({
  previous,
}) {
  const changes = [
    {
      field:
        'document.archived',

      label:
        'Document archived',

      before:
        true,

      after:
        false,
    },
  ];


  if (
    previous?.isCurrent ===
      true
  ) {
    changes.push({
      field:
        'document.isCurrent',

      label:
        'Current version',

      before:
        true,

      after:
        false,
    });
  }


  return changes;
}


async function setCurrentDocumentVersion({
  applicantId,
  documentId,

  includeAuditResult =
    false,

  ApplicantModel =
    Applicant,

  DocumentModel =
    ApplicantDocument,
}) {
  const applicantObjectId =
    await requireActiveApplicant({
      applicantId,
      ApplicantModel,
    });

  const documentObjectId =
    toObjectId(
      documentId,
      'documentId'
    );

  const target =
    await queryLean(
      DocumentModel.findOne({
        _id:
          documentObjectId,

        applicantId:
          applicantObjectId,

        'lifecycle.archived': {
          $ne: true,
        },
      })
    );

  if (!target) {
    throw serviceError(
      'DOCUMENT_NOT_FOUND',
      'Active Applicant document was not found.'
    );
  }

  /*
   * Once a Form document has been copied into
   * OMAH-managed storage, its historical
   * external reference must never become the
   * active document again.
   */
  if (
    target.source ===
      'form_submission' &&
    target.storage
      ?.provider ===
      'external'
  ) {
    throw serviceError(
      'FORM_DOCUMENT_MANAGED_COPY_REQUIRED',
      'Historical external Form references cannot be set as the current managed document.'
    );
  }

  if (target.isCurrent) {
    if (!includeAuditResult) {
      return target;
    }

    return {
      document:
        target,

      auditChanges:
        [],

      auditMetadata: {
        ...documentLifecycleAuditMetadata(
          target
        ),

        changed:
          false,
      },
    };
  }

  const previous =
    await queryLean(
      DocumentModel.findOne({
        applicantId:
          applicantObjectId,

        documentGroupId:
          target.documentGroupId,

        isCurrent: true,

        'lifecycle.archived': {
          $ne: true,
        },
      })
    );

  if (previous) {
    await DocumentModel.updateOne(
      {
        _id:
          previous._id,

        isCurrent: true,
      },
      {
        $set: {
          isCurrent: false,
        },
      }
    );
  }

  try {
    const result =
      await DocumentModel.updateOne(
        {
          _id:
            documentObjectId,

          applicantId:
            applicantObjectId,

          'lifecycle.archived': {
            $ne: true,
          },
        },
        {
          $set: {
            isCurrent: true,
          },
        },
        {
          runValidators:
            true,
        }
      );

    if (
      result.matchedCount !==
      1
    ) {
      throw serviceError(
        'DOCUMENT_VERSION_CONFLICT',
        'Document changed while setting the current version.'
      );
    }
  } catch (error) {
    if (previous) {
      try {
        await DocumentModel.updateOne(
          {
            _id:
              previous._id,
          },
          {
            $set: {
              isCurrent: true,
            },
          }
        );
      } catch (
        rollbackError
      ) {
        console.error(
          'Current-version rollback failed:',
          rollbackError.message
        );
      }
    }

    throw error;
  }

  const document =
    await queryLean(
      DocumentModel.findById(
        documentObjectId
      )
    );


  if (!includeAuditResult) {
    return document;
  }


  const auditChanges =
    buildDocumentCurrentAuditChanges({
      previous,
      target,
    });


  return {
    document,

    auditChanges,

    auditMetadata: {
      ...documentLifecycleAuditMetadata(
        document ||
        target
      ),

      changed:
        auditChanges.length >
        0,
    },
  };
}

async function archiveApplicantDocument({
  applicantId,
  documentId,
  archivedBy,
  reason = '',
  now = new Date(),

  includeAuditResult =
    false,

  ApplicantModel =
    Applicant,

  DocumentModel =
    ApplicantDocument,
}) {
  const applicantObjectId =
    await requireActiveApplicant({
      applicantId,
      ApplicantModel,
    });

  const documentObjectId =
    toObjectId(
      documentId,
      'documentId'
    );

  /*
   * Load the target first so we know whether
   * it is the current version and which
   * document group it belongs to.
   */
  const target =
    await queryLean(
      DocumentModel.findOne({
        _id:
          documentObjectId,

        applicantId:
          applicantObjectId,

        'lifecycle.archived': {
          $ne: true,
        },
      })
    );

  if (!target) {
    throw serviceError(
      'DOCUMENT_NOT_FOUND',
      'Active Applicant document was not found.'
    );
  }

  /*
   * If the current version is being archived,
   * select the newest remaining active version
   * before changing the target.
   */
  let replacementVersion =
    null;

  if (target.isCurrent) {
    replacementVersion =
      await queryLean(
        DocumentModel
          .findOne({
            applicantId:
              applicantObjectId,

            documentGroupId:
              target.documentGroupId,

            _id: {
              $ne:
                documentObjectId,
            },

            'lifecycle.archived': {
              $ne: true,
            },
          })
          .sort({
            version: -1,
          })
      );
  }

  const result =
    await DocumentModel.updateOne(
      {
        _id:
          documentObjectId,

        applicantId:
          applicantObjectId,

        'lifecycle.archived': {
          $ne: true,
        },
      },
      {
        $set: {
          isCurrent:
            false,

          'lifecycle.archived':
            true,

          'lifecycle.archivedAt':
            now,

          'lifecycle.archivedBy':
            String(
              archivedBy ?? ''
            ).trim(),

          'lifecycle.archiveReason':
            String(
              reason ?? ''
            ).trim(),
        },
      },
      {
        runValidators:
          true,
      }
    );

  if (
    result.matchedCount !==
    1
  ) {
    throw serviceError(
      'DOCUMENT_NOT_FOUND',
      'Active Applicant document was not found.'
    );
  }

  /*
   * Preserve the invariant:
   *
   * If another active version exists after the
   * current version is archived, promote the
   * newest remaining active version.
   *
   * setCurrentDocumentVersion already contains
   * the current-version conflict/rollback logic.
   */
  if (
    target.isCurrent &&
    replacementVersion
  ) {
    try {
      await setCurrentDocumentVersion({
        applicantId,
        documentId:
          replacementVersion._id,
        ApplicantModel,
        DocumentModel,
      });
    } catch (error) {
      /*
       * Best-effort rollback.
       *
       * There is no MongoDB transaction here,
       * so if promotion fails we try to restore
       * the archived current version.
       */
      try {
        await DocumentModel.updateOne(
          {
            _id:
              documentObjectId,

            applicantId:
              applicantObjectId,

            'lifecycle.archived':
              true,
          },
          {
            $set: {
              isCurrent:
                true,

              'lifecycle.archived':
                false,

              'lifecycle.archivedAt':
                null,

              'lifecycle.archivedBy':
                '',

              'lifecycle.archiveReason':
                '',
            },
          },
          {
            runValidators:
              true,
          }
        );
      } catch (
        rollbackError
      ) {
        console.error(
          'Document archive rollback failed:',
          rollbackError.message
        );
      }

      throw error;
    }
  }

  const archiveResult = {
    archived:
      true,
  };


  if (!includeAuditResult) {
    return archiveResult;
  }


  return {
    result:
      archiveResult,

    auditChanges:
      buildDocumentArchiveAuditChanges({
        target,
        replacementVersion,
      }),

    auditMetadata: {
      ...documentLifecycleAuditMetadata(
        target
      ),

      archiveReasonProvided:
        Boolean(
          String(
            reason ?? ''
          ).trim()
        ),

      wasCurrent:
        target?.isCurrent ===
        true,

      replacementDocumentId:
        (
          target?.isCurrent ===
            true
        )
          ? documentAuditId(
              replacementVersion?._id
            )
          : null,
    },
  };
}

async function restoreApplicantDocument({
  applicantId,
  documentId,

  includeAuditResult =
    false,

  ApplicantModel =
    Applicant,

  DocumentModel =
    ApplicantDocument,
}) {
  const applicantObjectId =
    await requireActiveApplicant({
      applicantId,
      ApplicantModel,
    });


  const documentObjectId =
    toObjectId(
      documentId,
      'documentId'
    );


  const filter = {
    _id:
      documentObjectId,

    applicantId:
      applicantObjectId,

    'lifecycle.archived':
      true,
  };


  const mutation = {
    $set: {
      /*
       * Restored versions do not
       * silently become current.
       */
      isCurrent:
        false,

      'lifecycle.archived':
        false,

      'lifecycle.archivedAt':
        null,

      'lifecycle.archivedBy':
        '',

      'lifecycle.archiveReason':
        '',
    },
  };


  /*
   * Preserve the existing updateOne
   * behavior for callers that do not
   * request precise Audit output.
   */
  if (!includeAuditResult) {
    const result =
      await DocumentModel.updateOne(
        filter,
        mutation,
        {
          runValidators:
            true,
        }
      );


    if (
      result.matchedCount !==
      1
    ) {
      throw serviceError(
        'DOCUMENT_NOT_FOUND',
        'Archived Applicant document was not found.'
      );
    }


    return {
      restored:
        true,

      isCurrent:
        false,
    };
  }


  if (
    typeof DocumentModel
      .findOneAndUpdate !==
      'function'
  ) {
    throw serviceError(
      'DOCUMENT_AUDIT_PREIMAGE_UNAVAILABLE',
      'Document restore Audit requires atomic pre-image support.'
    );
  }


  const previous =
    await queryLean(
      DocumentModel
        .findOneAndUpdate(
          filter,
          mutation,
          {
            new:
              false,

            runValidators:
              true,
          }
        )
    );


  if (!previous) {
    throw serviceError(
      'DOCUMENT_NOT_FOUND',
      'Archived Applicant document was not found.'
    );
  }


  const result = {
    restored:
      true,

    isCurrent:
      false,
  };


  return {
    result,

    auditChanges:
      buildDocumentRestoreAuditChanges({
        previous,
      }),

    auditMetadata: {
      ...documentLifecycleAuditMetadata(
        previous
      ),

      changed:
        true,
    },
  };
}

module.exports = {
  actorId,
  createApplicantDocument,
  replaceApplicantDocument,
  getApplicantDocuments,
  getDocumentVersions,
  getDocumentDownload,

  documentLifecycleAuditMetadata,
  buildDocumentCurrentAuditChanges,
  buildDocumentArchiveAuditChanges,
  buildDocumentRestoreAuditChanges,

  setCurrentDocumentVersion,
  archiveApplicantDocument,
  restoreApplicantDocument,
};

