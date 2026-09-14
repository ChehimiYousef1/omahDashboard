'use strict';

const ApplicantInterview =
  require(
    '../models/ApplicantInterview'
  );

const {
  assertMeetingProviderReady,
} = require(
  './interviewMeetingProviderService'
);

const {
  createGoogleMeetInterview,
  updateGoogleMeetInterview,
  cancelGoogleMeetInterview,
} = require(
  './googleMeetInterviewProvider'
);


function cleanText(value) {
  return String(
    value ?? ''
  ).trim();
}


function meetingProvider(
  interview
) {
  return cleanText(
    interview
      ?.meeting
      ?.provider
  ).toLowerCase();
}


function syncErrorText(
  error
) {
  const message =
    cleanText(
      error?.message
    ) ||
    'Meeting provider synchronization failed.';

  return message.slice(
    0,
    1000
  );
}


function buildGoogleProviderInput({
  interview,
  applicant,
}) {
  return {
    interviewId:
      cleanText(
        interview?._id ||
        interview?.id
      ),

    interviewType:
      interview?.type,

    applicantName:
      cleanText(
        applicant
          ?.identity
          ?.fullName ||
        applicant
          ?.fullName
      ),

    applicantEmail:
      cleanText(
        applicant
          ?.identity
          ?.email ||
        applicant
          ?.email
      ).toLowerCase(),

    scheduledStart:
      interview
        ?.scheduledStart,

    scheduledEnd:
      interview
        ?.scheduledEnd,

    timezone:
      cleanText(
        interview
          ?.timezone
      ) || 'UTC',

    participants:
      Array.isArray(
        interview
          ?.participants
      )
        ? interview
            .participants
        : [],

    organizerEmail:
      cleanText(
        interview
          ?.organizer
          ?.email
      ).toLowerCase(),

    location:
      cleanText(
        interview
          ?.location
      ),
  };
}


function assertInterviewMeetingReady({
  format,
  provider,
  env = process.env,
}) {
  if (
    cleanText(
      format
    ).toLowerCase() !==
    'online'
  ) {
    return null;
  }

  return assertMeetingProviderReady(
    provider,
    env
  );
}


async function persistMeetingState({
  interview,
  meetingPatch,

  InterviewModel =
    ApplicantInterview,

  now =
    () => new Date(),
}) {
  if (!interview?._id) {
    throw new Error(
      'Interview ID is required for meeting synchronization.'
    );
  }

  const previousMeeting =
    interview.meeting &&
    typeof interview.meeting ===
      'object'
      ? (
          typeof interview
            .meeting
            .toObject ===
          'function'
            ? interview
                .meeting
                .toObject()
            : {
                ...interview
                  .meeting,
              }
        )
      : {};

  const nextMeeting = {
    ...previousMeeting,
    ...meetingPatch,

    lastSyncedAt:
      now(),
  };

  const updated =
    await InterviewModel
      .findByIdAndUpdate(
        interview._id,

        {
          $set: {
            meeting:
              nextMeeting,

            /*
             * Legacy compatibility mirror.
             *
             * Clients still cannot write
             * meetingLink directly.
             */
            meetingLink:
              cleanText(
                nextMeeting
                  .joinUrl
              ),
          },
        },

        {
          new: true,
          runValidators: true,
        }
      );

  if (!updated) {
    throw new Error(
      'Interview disappeared while meeting synchronization was being saved.'
    );
  }

  return updated;
}


async function createInterviewMeeting({
  interview,
  applicant,

  env =
    process.env,

  InterviewModel =
    ApplicantInterview,

  createGoogleMeeting =
    createGoogleMeetInterview,

  now =
    () => new Date(),
}) {
  if (
    cleanText(
      interview?.format
    ).toLowerCase() !==
    'online'
  ) {
    return interview;
  }

  const provider =
    meetingProvider(
      interview
    );

  try {
    assertInterviewMeetingReady({
      format:
        interview.format,

      provider,

      env,
    });

    if (
      provider !==
      'google_meet'
    ) {
      throw new Error(
        'Meeting provider is not supported by the current synchronization adapter.'
      );
    }

    const result =
      await createGoogleMeeting({
        ...buildGoogleProviderInput({
          interview,
          applicant,
        }),

        env,
      });

    return persistMeetingState({
      interview,

      InterviewModel,

      now,

      meetingPatch: {
        provider:
          'google_meet',

        status:
          result.status ||
          'pending',

        providerMeetingId:
          cleanText(
            result
              .providerMeetingId
          ),

        providerEventId:
          cleanText(
            result
              .providerEventId
          ),

        joinUrl:
          cleanText(
            result
              .joinUrl
          ),

        syncError:
          cleanText(
            result
              .syncError
          ),
      },
    });
  } catch (error) {
    return persistMeetingState({
      interview,

      InterviewModel,

      now,

      meetingPatch: {
        provider:
          provider ||
          'google_meet',

        status:
          'error',

        syncError:
          syncErrorText(
            error
          ),
      },
    });
  }
}


async function updateInterviewMeeting({
  interview,
  applicant,

  env =
    process.env,

  InterviewModel =
    ApplicantInterview,

  updateGoogleMeeting =
    updateGoogleMeetInterview,

  createGoogleMeeting =
    createGoogleMeetInterview,

  now =
    () => new Date(),
}) {
  if (
    cleanText(
      interview?.format
    ).toLowerCase() !==
    'online'
  ) {
    return interview;
  }

  const provider =
    meetingProvider(
      interview
    );

  try {
    assertInterviewMeetingReady({
      format:
        interview.format,

      provider,

      env,
    });

    if (
      provider !==
      'google_meet'
    ) {
      throw new Error(
        'Meeting provider is not supported by the current synchronization adapter.'
      );
    }

    const eventId =
      cleanText(
        interview
          ?.meeting
          ?.providerEventId
      );

    /*
     * Safe retry:
     *
     * If Google never returned an
     * event ID during creation, try
     * creation again instead of
     * patching a nonexistent event.
     */
    if (!eventId) {
      return createInterviewMeeting({
        interview,
        applicant,
        env,
        InterviewModel,
        createGoogleMeeting,
        now,
      });
    }

    const result =
      await updateGoogleMeeting({
        providerEventId:
          eventId,

        ...buildGoogleProviderInput({
          interview,
          applicant,
        }),

        env,
      });

    return persistMeetingState({
      interview,

      InterviewModel,

      now,

      meetingPatch: {
        provider:
          'google_meet',

        status:
          result.status ||
          'created',

        providerMeetingId:
          cleanText(
            result
              .providerMeetingId
          ) ||
          cleanText(
            interview
              ?.meeting
              ?.providerMeetingId
          ),

        providerEventId:
          cleanText(
            result
              .providerEventId
          ) ||
          eventId,

        joinUrl:
          cleanText(
            result
              .joinUrl
          ) ||
          cleanText(
            interview
              ?.meeting
              ?.joinUrl
          ),

        syncError:
          cleanText(
            result
              .syncError
          ),
      },
    });
  } catch (error) {
    return persistMeetingState({
      interview,

      InterviewModel,

      now,

      meetingPatch: {
        status:
          'error',

        syncError:
          syncErrorText(
            error
          ),
      },
    });
  }
}


async function cancelInterviewMeeting({
  interview,

  env =
    process.env,

  InterviewModel =
    ApplicantInterview,

  cancelGoogleMeeting =
    cancelGoogleMeetInterview,

  now =
    () => new Date(),
}) {
  const provider =
    meetingProvider(
      interview
    );

  const eventId =
    cleanText(
      interview
        ?.meeting
        ?.providerEventId
    );

  if (
    provider !==
      'google_meet' ||
    !eventId
  ) {
    return interview;
  }

  try {
    assertMeetingProviderReady(
      provider,
      env
    );

    await cancelGoogleMeeting({
      providerEventId:
        eventId,

      env,
    });

    return persistMeetingState({
      interview,

      InterviewModel,

      now,

      meetingPatch: {
        status:
          'cancelled',

        /*
         * Keep the provider IDs for
         * traceability, but remove
         * access to the cancelled Meet.
         */
        joinUrl:
          '',

        syncError:
          '',
      },
    });
  } catch (error) {
    /*
     * Preserve provider IDs when
     * cleanup fails so cancellation
     * can be retried later.
     */
    return persistMeetingState({
      interview,

      InterviewModel,

      now,

      meetingPatch: {
        status:
          'error',

        syncError:
          syncErrorText(
            error
          ),
      },
    });
  }
}


module.exports = {
  buildGoogleProviderInput,
  assertInterviewMeetingReady,
  persistMeetingState,

  createInterviewMeeting,
  updateInterviewMeeting,
  cancelInterviewMeeting,
};
