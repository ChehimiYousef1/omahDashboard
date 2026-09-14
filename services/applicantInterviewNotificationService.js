'use strict';


function cleanText(value) {
  return String(value ?? '').trim();
}


function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}


function isValidEmail(value) {
  const email = normalizeEmail(value);

  return (
    email.length > 0 &&
    email.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}


function interviewEmailEnabled(env = process.env) {
  return (
    cleanText(
      env.INTERVIEW_EMAIL_ENABLED
    ).toLowerCase() === 'true'
  );
}


function isInterviewer(participant) {
  const participantType =
    cleanText(
      participant?.participantType
    ).toLowerCase();

  const role =
    cleanText(
      participant?.role
    ).toLowerCase();

  return (
    participantType === 'interviewer' ||
    role.includes('interviewer')
  );
}


function buildInterviewNotificationRecipients({
  interview,
  env = process.env,
}) {
  const recipients = [];
  const seen = new Set();


  function addRecipient({
    email,
    name = '',
    kind,
  }) {
    const normalizedEmail =
      normalizeEmail(email);

    if (
      !isValidEmail(normalizedEmail) ||
      seen.has(normalizedEmail)
    ) {
      return;
    }

    seen.add(normalizedEmail);

    recipients.push({
      email: normalizedEmail,
      name: cleanText(name),
      kind,
    });
  }


  /*
   * Company notification mailbox.
   */
  addRecipient({
    email:
      env.INTERVIEW_NOTIFICATION_COMPANY_EMAIL,

    name:
      env.INTERVIEW_NOTIFICATION_COMPANY_NAME ||
      'OMAH Recruitment',

    kind:
      'company',
  });


  /*
   * Interviewers only.
   *
   * Applicant/guest participants are intentionally
   * excluded from this transactional notification.
   */
  for (
    const participant
    of interview?.participants || []
  ) {
    if (!isInterviewer(participant)) {
      continue;
    }

    addRecipient({
      email:
        participant.email,

      name:
        participant.name,

      kind:
        'interviewer',
    });
  }


  return recipients;
}


function applicantName(applicant) {
  return (
    cleanText(
      applicant?.identity?.fullName
    ) ||
    'Applicant'
  );
}


function formatInterviewDate({
  value,
  timezone,
}) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  const requestedTimezone =
    cleanText(timezone) ||
    'UTC';

  try {
    return new Intl.DateTimeFormat(
      'en-GB',
      {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone:
          requestedTimezone,
      }
    ).format(date);
  } catch {
    return new Intl.DateTimeFormat(
      'en-GB',
      {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'UTC',
      }
    ).format(date);
  }
}


function meetingJoinUrl(interview) {
  return (
    cleanText(
      interview?.meeting?.joinUrl
    ) ||
    cleanText(
      interview?.meetingLink
    )
  );
}


function onlineMeetingReady(interview) {
  const format =
    cleanText(
      interview?.format
    ).toLowerCase();

  if (format !== 'online') {
    return true;
  }

  return (
    cleanText(
      interview?.meeting?.status
    ).toLowerCase() === 'created' &&
    Boolean(
      meetingJoinUrl(interview)
    )
  );
}


function buildInterviewNotificationMessage({
  interview,
  applicant,
  eventType = 'scheduled',
}) {
  const name =
    applicantName(applicant);

  const timezone =
    cleanText(
      interview?.timezone
    ) ||
    'UTC';

  const format =
    cleanText(
      interview?.format
    ) ||
    'online';

  const type =
    cleanText(
      interview?.type
    ) ||
    'interview';

  const start =
    formatInterviewDate({
      value:
        interview?.scheduledStart,

      timezone,
    });

  const end =
    formatInterviewDate({
      value:
        interview?.scheduledEnd,

      timezone,
    });


  const action =
    eventType === 'rescheduled'
      ? 'Rescheduled'
      : eventType === 'cancelled'
        ? 'Cancelled'
        : 'Scheduled';


  const lines = [
    `An applicant interview has been ${action.toLowerCase()}.`,
    '',
    `Applicant: ${name}`,
    `Interview type: ${type}`,
    `Format: ${format}`,
    `Start: ${start}`,
    `End: ${end}`,
    `Timezone: ${timezone}`,
  ];


  const joinUrl =
    meetingJoinUrl(interview);

  if (
    format === 'online' &&
    joinUrl
  ) {
    lines.push(
      `Meeting link: ${joinUrl}`
    );
  }


  const location =
    cleanText(
      interview?.location
    );

  if (
    format === 'onsite' &&
    location
  ) {
    lines.push(
      `Location: ${location}`
    );
  }


  const cancellationReason =
    cleanText(
      interview
        ?.cancellationReason
    );

  if (
    eventType ===
      'cancelled' &&
    cancellationReason
  ) {
    lines.push(
      '',
      `Cancellation reason: ${cancellationReason}`
    );
  }


  const notes =
    cleanText(
      interview?.notes
    );

  if (notes) {
    lines.push(
      '',
      `Notes: ${notes}`
    );
  }


  lines.push(
    '',
    'OMAH Applicant Management'
  );


  return {
    subject:
      `[OMAH] Interview ${action}: ${name}`,

    text:
      lines.join('\n'),
  };
}


async function sendApplicantInterviewNotification({
  interview,
  applicant,

  eventType = 'scheduled',

  transporter,

  env = process.env,

  logger = console,
}) {
  if (!interviewEmailEnabled(env)) {
    return {
      status: 'disabled',
      sent: 0,
      failed: 0,
      recipients: [],
    };
  }


  /*
   * Never announce an online interview
   * before the generated meeting exists.
   */
  if (
    eventType !==
      'cancelled' &&
    !onlineMeetingReady(
      interview
    )
  ) {
    return {
      status:
        'meeting_not_ready',

      sent: 0,
      failed: 0,
      recipients: [],
    };
  }


  if (
    !cleanText(env.SMTP_USER) ||
    !cleanText(env.SMTP_PASS) ||
    !transporter ||
    typeof transporter.sendMail !==
      'function'
  ) {
    return {
      status:
        'smtp_not_configured',

      sent: 0,
      failed: 0,
      recipients: [],
    };
  }


  const recipients =
    buildInterviewNotificationRecipients({
      interview,
      env,
    });


  if (recipients.length === 0) {
    return {
      status:
        'no_recipients',

      sent: 0,
      failed: 0,
      recipients: [],
    };
  }


  const message =
    buildInterviewNotificationMessage({
      interview,
      applicant,
      eventType,
    });


  const fromAddress =
    cleanText(
      env.INTERVIEW_EMAIL_FROM
    ) ||
    cleanText(
      env.SMTP_USER
    );

  const fromName =
    cleanText(
      env.INTERVIEW_EMAIL_FROM_NAME
    ) ||
    'OMAH Recruitment';


  let sent = 0;
  let failed = 0;

  const failures = [];


  for (const recipient of recipients) {
    try {
      await transporter.sendMail({
        from:
          `"${fromName}" <${fromAddress}>`,

        to:
          recipient.email,

        subject:
          message.subject,

        text:
          message.text,
      });

      sent += 1;
    } catch (error) {
      failed += 1;

      failures.push({
        email:
          recipient.email,

        error:
          cleanText(
            error?.message
          ) ||
          'Unknown SMTP error',
      });

      logger.error?.(
        'Interview notification email failed:',
        recipient.email,
        error?.message || error
      );
    }
  }


  return {
    status:
      failed === 0
        ? 'sent'
        : sent > 0
          ? 'partial_failure'
          : 'failed',

    sent,
    failed,

    recipients:
      recipients.map(
        (recipient) => ({
          email:
            recipient.email,

          kind:
            recipient.kind,
        })
      ),

    failures,
  };
}


module.exports = {
  buildInterviewNotificationRecipients,
  buildInterviewNotificationMessage,
  onlineMeetingReady,
  sendApplicantInterviewNotification,
};
