'use strict';

const ApplicantActivity =
  require('../models/ApplicantActivity');

const {
  toObjectId,
} = require(
  './applicantSubmissionService'
);

const {
  APPLICANT_ACTIVITY_TYPES,
  activityCategoryForType,
} = require(
  '../utils/applicantActivity'
);


function activityError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code =
    code;

  return error;
}


function cleanText(value) {
  return String(
    value ?? ''
  ).trim();
}


function normalizeActor(
  actor = {}
) {
  if (
    !actor ||
    typeof actor !==
      'object' ||
    Array.isArray(actor)
  ) {
    return {
      userId: '',
      name: '',
      email: '',
      role: '',
    };
  }

  return {
    userId:
      cleanText(
        actor.userId
      ),

    name:
      cleanText(
        actor.name
      ),

    email:
      cleanText(
        actor.email
      ).toLowerCase(),

    role:
      cleanText(
        actor.role
      ),
  };
}


function normalizeSource(
  source = {}
) {
  if (
    !source ||
    typeof source !==
      'object' ||
    Array.isArray(source)
  ) {
    return {
      type: '',
      id: '',
    };
  }

  return {
    type:
      cleanText(
        source.type
      ),

    id:
      cleanText(
        source.id
      ),
  };
}


function buildApplicantActivity({
  applicantId,
  type,
  title,
  description = '',
  occurredAt =
    new Date(),
  actor = {},
  source = {},
  metadata = {},
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const cleanType =
    cleanText(type);

  if (
    !APPLICANT_ACTIVITY_TYPES
      .includes(cleanType)
  ) {
    throw activityError(
      'APPLICANT_ACTIVITY_TYPE_INVALID',
      'Applicant activity type is invalid.'
    );
  }


  const cleanTitle =
    cleanText(title);

  if (!cleanTitle) {
    throw activityError(
      'APPLICANT_ACTIVITY_TITLE_REQUIRED',
      'Applicant activity title is required.'
    );
  }


  const eventDate =
    occurredAt instanceof Date
      ? occurredAt
      : new Date(
          occurredAt
        );

  if (
    Number.isNaN(
      eventDate.getTime()
    )
  ) {
    throw activityError(
      'APPLICANT_ACTIVITY_DATE_INVALID',
      'Applicant activity date is invalid.'
    );
  }


  return {
    applicantId:
      applicantObjectId,

    type:
      cleanType,

    category:
      activityCategoryForType(
        cleanType
      ),

    title:
      cleanTitle,

    description:
      cleanText(
        description
      ),

    occurredAt:
      eventDate,

    actor:
      normalizeActor(
        actor
      ),

    source:
      normalizeSource(
        source
      ),

    metadata:
      (
        metadata &&
        typeof metadata ===
          'object' &&
        !Array.isArray(
          metadata
        )
      )
        ? metadata
        : {},
  };
}


async function recordApplicantActivity({
  ActivityModel =
    ApplicantActivity,

  ...input
}) {
  const event =
    buildApplicantActivity(
      input
    );

  return ActivityModel.create(
    event
  );
}


module.exports = {
  cleanText,
  normalizeActor,
  normalizeSource,
  buildApplicantActivity,
  recordApplicantActivity,
};
