'use strict';

const Applicant =
  require('../models/Applicant');

const {
  toObjectId,
} = require(
  './applicantSubmissionService'
);


const {
  sendWhatsAppText,
} = require(
  './whatsappCloudService'
);


function cleanText(value) {
  return String(
    value ?? ''
  ).trim();
}


function communicationError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code =
    code;

  return error;
}


async function requireApplicantForCommunication({
  applicantId,

  ApplicantModel =
    Applicant,
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const applicant =
    await ApplicantModel.findById(
      applicantObjectId
    );

  if (!applicant) {
    throw communicationError(
      'APPLICANT_NOT_FOUND',

      'Applicant was not found.'
    );
  }

  return applicant;
}


async function sendApplicantEmail({
  applicantId,
  subject,
  body,

  transporter,

  ApplicantModel =
    Applicant,

  env =
    process.env,
}) {
  const applicant =
    await requireApplicantForCommunication({
      applicantId,
      ApplicantModel,
    });

  const email =
    cleanText(
      applicant.identity
        ?.email
    ).toLowerCase();

  if (!email) {
    throw communicationError(
      'APPLICANT_EMAIL_REQUIRED',

      'Applicant does not have an email address.'
    );
  }


  const cleanSubject =
    cleanText(subject);

  const cleanBody =
    cleanText(body);

  if (!cleanSubject) {
    throw communicationError(
      'APPLICANT_EMAIL_SUBJECT_REQUIRED',

      'Email subject is required.'
    );
  }

  if (!cleanBody) {
    throw communicationError(
      'APPLICANT_EMAIL_BODY_REQUIRED',

      'Email message is required.'
    );
  }


  if (
    !transporter ||
    typeof transporter.sendMail !==
      'function'
  ) {
    throw communicationError(
      'APPLICANT_EMAIL_TRANSPORT_UNAVAILABLE',

      'Applicant email delivery is not configured.'
    );
  }


  const fromAddress =
    cleanText(
      env.APPLICANT_EMAIL_FROM ||
      env.INTERVIEW_EMAIL_FROM ||
      env.SMTP_USER
    );

  const fromName =
    cleanText(
      env.APPLICANT_EMAIL_FROM_NAME ||
      env.INTERVIEW_EMAIL_FROM_NAME ||
      'OMAH Recruitment'
    );


  if (!fromAddress) {
    throw communicationError(
      'APPLICANT_EMAIL_SENDER_REQUIRED',

      'Applicant email sender is not configured.'
    );
  }


  await transporter.sendMail({
    from:
      `"${fromName}" <${fromAddress}>`,

    to:
      email,

    subject:
      cleanSubject,

    text:
      cleanBody,
  });


  return {
    sent:
      true,

    applicantId:
      String(
        applicant._id
      ),

    recipient: {
      name:
        cleanText(
          applicant.identity
            ?.fullName
        ),

      email,
    },
  };
}


async function sendApplicantWhatsApp({
  applicantId,
  message,

  ApplicantModel =
    Applicant,

  sendWhatsApp =
    sendWhatsAppText,

  env =
    process.env,
}) {
  const applicant =
    await requireApplicantForCommunication({
      applicantId,
      ApplicantModel,
    });


  /*
   * Prefer the explicitly stored WhatsApp
   * number. Fall back to the Applicant phone
   * number only when no separate WhatsApp
   * number exists.
   */
  const phone =
    cleanText(
      applicant.identity
        ?.whatsappNumber ||
      applicant.identity
        ?.phoneNumber
    );


  if (!phone) {
    throw communicationError(
      'APPLICANT_WHATSAPP_REQUIRED',

      'Applicant does not have a WhatsApp or phone number.'
    );
  }


  const delivery =
    await sendWhatsApp({
      to:
        phone,

      message,

      env,
    });


  return {
    sent:
      delivery.sent ===
      true,

    provider:
      delivery.provider ||
      'whatsapp_cloud',

    applicantId:
      String(
        applicant._id
      ),

    recipient: {
      name:
        cleanText(
          applicant.identity
            ?.fullName
        ),

      whatsappNumber:
        delivery.recipient ||
        phone,
    },

    messageId:
      delivery.messageId ||
      '',
  };
}


module.exports = {
  cleanText,
  requireApplicantForCommunication,
  sendApplicantEmail,
  sendApplicantWhatsApp,
};
