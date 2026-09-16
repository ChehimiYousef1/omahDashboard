'use strict';

const Applicant =
  require('../models/Applicant');

const ApplicantDocument =
  require('../models/ApplicantDocument');

const ApplicantEvaluation =
  require('../models/ApplicantEvaluation');

const ApplicantInterview =
  require('../models/ApplicantInterview');

const ApplicantActivity =
  require('../models/ApplicantActivity');


const ApplicantInternalNote =
  require(
    '../models/ApplicantInternalNote'
  );


const ApplicantInternalNoteReply =
  require(
    '../models/ApplicantInternalNoteReply'
  );

const {
  ApplicantDuplicateCase,
} = require(
  '../models/ApplicantDuplicateCase'
);

const {
  toObjectId,
} = require(
  './applicantSubmissionService'
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

  error.code =
    code;

  return error;
}


async function resolveLean(
  query
) {
  if (
    query &&
    typeof query.lean ===
      'function'
  ) {
    return query.lean();
  }

  return query;
}


async function deleteMany(
  Model,
  filter
) {
  const result =
    await Model.deleteMany(
      filter
    );

  return Number(
    result?.deletedCount ||
    0
  );
}


function isProviderMeetingActive(
  interview
) {
  const format =
    String(
      interview?.format ||
      ''
    )
      .trim()
      .toLowerCase();

  const providerEventId =
    String(
      interview
        ?.meeting
        ?.providerEventId ||
      ''
    ).trim();

  const meetingStatus =
    String(
      interview
        ?.meeting
        ?.status ||
      ''
    )
      .trim()
      .toLowerCase();

  return (
    format === 'online' &&
    Boolean(
      providerEventId
    ) &&
    meetingStatus !==
      'cancelled'
  );
}


function isInterviewSafeToDelete(
  interview
) {
  return (
    String(
      interview?.status ||
      ''
    )
      .trim()
      .toLowerCase() ===
      'cancelled' ||
    interview?.archived ===
      true
  );
}


async function permanentlyDeleteApplicant({
  applicantId,
  confirmation,

  ApplicantModel = Applicant,

  DocumentModel = ApplicantDocument,

  EvaluationModel = ApplicantEvaluation,

  InterviewModel = ApplicantInterview,

  DuplicateCaseModel = ApplicantDuplicateCase,

  ActivityModel = ApplicantActivity,

  NoteModel =
    ApplicantInternalNote,

  ReplyModel =
    ApplicantInternalNoteReply,


  storageFactory = createDocumentStorageFactory(),
} = {}) {
  if (
    String(
      confirmation ||
      ''
    ).trim() !==
    'DELETE'
  ) {
    throw serviceError(
      'APPLICANT_DELETE_CONFIRMATION_REQUIRED',
      'Permanent Applicant deletion requires DELETE confirmation.'
    );
  }


  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );


  const applicant =
    await resolveLean(
      ApplicantModel.findById(
        applicantObjectId
      )
    );


  if (!applicant) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found.'
    );
  }


  /*
   * Permanent deletion is a second-stage
   * operation only.
   *
   * Active Applicants must first be archived.
   */
  if (
    applicant.lifecycle
      ?.archived !== true
  ) {
    throw serviceError(
      'APPLICANT_PERMANENT_DELETE_NOT_ALLOWED',
      'Applicant must be archived before permanent deletion.'
    );
  }


  const interviews =
    await resolveLean(
      InterviewModel.find({
        applicantId:
          applicantObjectId,
      })
    ) || [];


  /*
   * Never silently cancel a real interview
   * as a side effect of deleting an Applicant.
   */
  const unsafeInterview =
    interviews.find(
      interview =>
        !isInterviewSafeToDelete(
          interview
        )
    );

  if (unsafeInterview) {
    throw serviceError(
      'APPLICANT_PERMANENT_DELETE_ACTIVE_INTERVIEWS',
      'Permanent deletion is blocked while the Applicant has an active interview. Cancel or archive the interview first.'
    );
  }


  /*
   * Likewise, do not implicitly modify an
   * external Calendar/meeting provider.
   *
   * Any provider-backed meeting must already
   * be cancelled before Applicant deletion.
   */
  const providerActive =
    interviews.find(
      isProviderMeetingActive
    );

  if (providerActive) {
    throw serviceError(
      'APPLICANT_PERMANENT_DELETE_PROVIDER_MEETING_ACTIVE',
      'Permanent deletion is blocked because an interview still has an active provider meeting.'
    );
  }


  /*
   * Internal Notes/Tasks can also own real
   * Google Calendar events.
   *
   * Never permanently delete an Applicant while
   * one of those external events remains linked.
   */
  const internalNotes =
    await resolveLean(
      NoteModel.find({
        applicantId:
          applicantObjectId,
      })
    ) || [];

  const calendarLinkedInternalItem =
    internalNotes.find(
      note =>
        Boolean(
          String(
            note?.calendar
              ?.eventId ||
            ''
          ).trim()
        )
    );

  if (
    calendarLinkedInternalItem
  ) {
    throw serviceError(
      'APPLICANT_PERMANENT_DELETE_INTERNAL_CALENDAR_ACTIVE',
      'Permanent deletion is blocked because an internal note or task is still linked to Google Calendar. Remove the Calendar event first.'
    );
  }


  const documents =
    await resolveLean(
      DocumentModel.find({
        applicantId:
          applicantObjectId,
      })
    ) || [];


  /*
   * Preflight every managed storage provider
   * before beginning destructive cleanup.
   */
  const cleanupTargets =
    [];

  const seenStorage =
    new Set();

  for (
    const document
    of documents
  ) {
    const provider =
      String(
        document
          ?.storage
          ?.provider ||
        ''
      ).trim();

    const key =
      String(
        document
          ?.storage
          ?.key ||
        ''
      ).trim();

    /*
     * External source files are never
     * deleted by OMAH.
     */
    if (
      provider ===
      'external'
    ) {
      continue;
    }

    if (
      provider !== 'local' &&
      provider !== 's3'
    ) {
      throw serviceError(
        'APPLICANT_PERMANENT_DELETE_STORAGE_INVALID',
        'Applicant document has an unsupported storage provider.'
      );
    }

    if (!key) {
      throw serviceError(
        'APPLICANT_PERMANENT_DELETE_STORAGE_INVALID',
        'Managed Applicant document is missing its storage key.'
      );
    }

    const identity =
      `${provider}:${key}`;

    if (
      seenStorage.has(
        identity
      )
    ) {
      continue;
    }

    seenStorage.add(
      identity
    );

    const storageProvider =
      storageFactory
        .getProvider(
          provider
        );

    if (
      typeof storageProvider
        ?.cleanup !==
      'function'
    ) {
      throw serviceError(
        'APPLICANT_PERMANENT_DELETE_STORAGE_INVALID',
        'Document storage provider does not support safe cleanup.'
      );
    }

    cleanupTargets.push({
      provider,
      key,
      storageProvider,
    });
  }


  let managedFilesDeleted =
    0;

  let managedFilesAlreadyMissing =
    0;


  /*
   * Remove OMAH-owned binary files.
   *
   * External Form/legacy URLs are skipped.
   */
  for (
    const target
    of cleanupTargets
  ) {
    try {
      const removed =
        await target
          .storageProvider
          .cleanup({
            key:
              target.key,
          });

      if (removed) {
        managedFilesDeleted +=
          1;
      } else {
        managedFilesAlreadyMissing +=
          1;
      }
    } catch (error) {
      throw serviceError(
        'APPLICANT_PERMANENT_DELETE_STORAGE_CLEANUP_FAILED',
        'Managed Applicant document storage cleanup failed. Permanent deletion was stopped.'
      );
    }
  }


  /*
   * All interviews passed the safety preflight,
   * therefore no external Calendar mutation is
   * necessary here.
   */
  const interviewsDeleted =
    await deleteMany(
      InterviewModel,
      {
        applicantId:
          applicantObjectId,
      }
    );


  const evaluationsDeleted =
    await deleteMany(
      EvaluationModel,
      {
        applicantId:
          applicantObjectId,
      }
    );


  const documentsDeleted =
    await deleteMany(
      DocumentModel,
      {
        applicantId:
          applicantObjectId,
      }
    );


  const duplicateCasesDeleted =
    await deleteMany(
      DuplicateCaseModel,
      {
        $or: [
          {
            sourceApplicantId:
              applicantObjectId,
          },
          {
            candidateApplicantId:
              applicantObjectId,
          },
        ],
      }
    );


  const activitiesDeleted =
    await deleteMany(
      ActivityModel,
      {
        applicantId:
          applicantObjectId,
      }
    );



  /*
   * Replies are dependent on internal
   * notes/tasks and are removed first.
   */
  const noteRepliesDeleted =
    await deleteMany(
      ReplyModel,
      {
        applicantId:
          applicantObjectId,
      }
    );


  const notesDeleted =
    await deleteMany(
      NoteModel,
      {
        applicantId:
          applicantObjectId,
      }
    );


  /*
   * IMPORTANT:
   *
   * ApplicantFormSubmission is deliberately
   * NOT modified or deleted.
   *
   * Its historical applicantId remains intact.
   * Therefore a replay sees a missing linked
   * Applicant and raises
   * LINKED_APPLICANT_UNAVAILABLE instead of
   * recreating a deleted Applicant.
   */


  const applicantDelete =
    await ApplicantModel.deleteOne({
      _id:
        applicantObjectId,

      'lifecycle.archived':
        true,
    });


  if (
    applicantDelete
      ?.deletedCount !==
    1
  ) {
    throw serviceError(
      'APPLICANT_PERMANENT_DELETE_CONFLICT',
      'Applicant changed before permanent deletion could complete.'
    );
  }


  return {
    status:
      'applicant-permanently-deleted',

    applicantId:
      String(
        applicantObjectId
      ),

    preservedFormSubmissions:
      true,

    managedFilesDeleted,

    managedFilesAlreadyMissing,

    deleted: {
      applicant:
        1,

      documents:
        documentsDeleted,

      evaluations:
        evaluationsDeleted,

      interviews:
        interviewsDeleted,

      duplicateCases:
        duplicateCasesDeleted,

      activities:
        activitiesDeleted,


      noteReplies:
        noteRepliesDeleted,

      notes:
        notesDeleted,
    },
  };
}


module.exports = {
  isProviderMeetingActive,
  isInterviewSafeToDelete,
  permanentlyDeleteApplicant,
};
