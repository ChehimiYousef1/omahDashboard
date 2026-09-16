'use strict';


const APPLICANT_ACTIVITY_CATEGORIES = [
  'submission',
  'profile',
  'status',
  'evaluation',
  'interview',
  'communication',
  'lifecycle',
  'note',
  'task',
  'document',
  'system',
];


const APPLICANT_ACTIVITY_TYPES = [
  'submission.created',
  'submission.linked',

  'profile.updated',
  'profile.approved',
  'profile.tags_updated',

  'status.changed',

  'evaluation.created',
  'evaluation.submitted',
  'evaluation.reopened',
  'evaluation.archived',

  'interview.scheduled',
  'interview.rescheduled',
  'interview.completed',
  'interview.cancelled',
  'interview.no_show',
  'interview.archived',

  'communication.email.sent',
  'communication.whatsapp.sent',

  'applicant.archived',
  'applicant.restored',

  'note.created',
  'note.updated',
  'note.deleted',
  'note.archived',
  'note.restored',
  'note.permanently_deleted',
  'note.calendar_added',
  'note.calendar_updated',
  'note.calendar_removed',
  'note.reply_created',
  'note.reply_updated',
  'note.reply_archived',
  'note.reply_restored',
  'note.reply_permanently_deleted',

  'task.created',
  'task.updated',
  'task.completed',
  'task.reopened',
  'task.archived',
  'task.restored',
  'task.permanently_deleted',
  'task.calendar_added',
  'task.calendar_updated',
  'task.calendar_removed',

  'document.uploaded',
  'document.replaced',
  'document.archived',
];


function activityCategoryForType(
  type
) {
  const value =
    String(type ?? '')
      .trim();

  if (
    value.startsWith(
      'applicant.'
    )
  ) {
    return 'lifecycle';
  }

  const category =
    value.split('.')[0];

  return (
    APPLICANT_ACTIVITY_CATEGORIES
      .includes(category)
      ? category
      : 'system'
  );
}


module.exports = {
  APPLICANT_ACTIVITY_CATEGORIES,
  APPLICANT_ACTIVITY_TYPES,
  activityCategoryForType,
};
