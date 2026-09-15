'use strict';

const assert =
  require('assert');

const {
  sendApplicantEmail,
  sendApplicantWhatsApp,
} = require(
  '../services/applicantCommunicationService'
);


const applicantId =
  '64b000000000000000000001';


const applicant = {
  _id:
    applicantId,

  identity: {
    fullName:
      'Test Applicant',

    email:
      'Applicant@Example.com',

    phoneNumber:
      '+96170111111',

    whatsappNumber:
      '+96170222222',
  },
};


const ApplicantModel = {
  async findById() {
    return applicant;
  },
};


async function main() {
  let emailDelivery =
    null;

  const fakeTransporter = {
    async sendMail(payload) {
      emailDelivery =
        payload;

      return {
        accepted: [
          payload.to,
        ],
      };
    },
  };


  const emailResult =
    await sendApplicantEmail({
      applicantId,

      subject:
        ' Application Update ',

      body:
        ' Hello Applicant ',

      transporter:
        fakeTransporter,

      ApplicantModel,

      env: {
        APPLICANT_EMAIL_FROM:
          'recruitment@example.com',

        APPLICANT_EMAIL_FROM_NAME:
          'OMAH Recruitment',
      },
    });


  assert.strictEqual(
    emailResult.sent,
    true
  );

  assert.strictEqual(
    emailDelivery.to,
    'applicant@example.com'
  );

  assert.strictEqual(
    emailDelivery.subject,
    'Application Update'
  );

  assert.strictEqual(
    emailDelivery.text,
    'Hello Applicant'
  );

  console.log(
    '✅ Applicant email uses stored profile recipient'
  );


  let whatsappDelivery =
    null;

  const fakeWhatsApp = async (
    payload
  ) => {
    whatsappDelivery =
      payload;

    return {
      sent:
        true,

      provider:
        'whatsapp_cloud',

      recipient:
        '96170222222',

      messageId:
        'wamid.fake-test',
    };
  };


  const whatsappResult =
    await sendApplicantWhatsApp({
      applicantId,

      message:
        'Hello from OMAH',

      ApplicantModel,

      sendWhatsApp:
        fakeWhatsApp,

      env: {
        WHATSAPP_CLOUD_ENABLED:
          'true',
      },
    });


  assert.strictEqual(
    whatsappDelivery.to,
    '+96170222222'
  );

  assert.strictEqual(
    whatsappDelivery.message,
    'Hello from OMAH'
  );

  assert.strictEqual(
    whatsappResult.sent,
    true
  );

  assert.strictEqual(
    whatsappResult.recipient
      .whatsappNumber,
    '96170222222'
  );

  assert.strictEqual(
    whatsappResult.messageId,
    'wamid.fake-test'
  );

  console.log(
    '✅ Applicant WhatsApp uses stored profile recipient'
  );


  const applicantWithoutWhatsApp = {
    ...applicant,

    identity: {
      ...applicant.identity,

      whatsappNumber:
        '',

      phoneNumber:
        '',
    },
  };


  const MissingPhoneModel = {
    async findById() {
      return applicantWithoutWhatsApp;
    },
  };


  await assert.rejects(
    () =>
      sendApplicantWhatsApp({
        applicantId,

        message:
          'Hello',

        ApplicantModel:
          MissingPhoneModel,

        sendWhatsApp:
          fakeWhatsApp,
      }),

    (error) =>
      error.code ===
      'APPLICANT_WHATSAPP_REQUIRED'
  );


  console.log(
    '✅ missing WhatsApp recipient rejected'
  );


  console.log(
    'APPLICANT COMMUNICATION SERVICE TEST PASSED'
  );
}


main().catch(
  (error) => {
    console.error(error);

    process.exit(1);
  }
);
