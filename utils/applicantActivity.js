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

  'task.created',
  'task.completed',
  'task.reopened',

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
