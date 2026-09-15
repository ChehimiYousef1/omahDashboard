'use strict';


const APPLICANT_PIPELINE_STAGES =
  Object.freeze([
    Object.freeze({
      value: 'applied',
      label: 'New',
      order: 1,
      terminal: false,
    }),

    Object.freeze({
      value: 'reviewed',
      label: 'Under Review',
      order: 2,
      terminal: false,
    }),

    Object.freeze({
      value: 'shortlisted',
      label: 'Shortlisted',
      order: 3,
      terminal: false,
    }),

    Object.freeze({
      value: 'interview',
      label: 'Interview',
      order: 4,
      terminal: false,
    }),

    Object.freeze({
      value: 'offered',
      label: 'Offered',
      order: 5,
      terminal: false,
    }),

    Object.freeze({
      value: 'hired',
      label: 'Hired',
      order: 6,
      terminal: true,
    }),

    Object.freeze({
      value: 'rejected',
      label: 'Rejected',
      order: 7,
      terminal: true,
    }),
  ]);


const APPLICANT_STATUSES =
  Object.freeze(
    APPLICANT_PIPELINE_STAGES.map(
      stage =>
        stage.value
    )
  );


const APPLICANT_STATUS_LABELS =
  Object.freeze(
    Object.fromEntries(
      APPLICANT_PIPELINE_STAGES.map(
        stage => [
          stage.value,
          stage.label,
        ]
      )
    )
  );


const APPLICANT_STATUS_TRANSITIONS =
  Object.freeze({
    applied:
      Object.freeze([
        'reviewed',
        'rejected',
      ]),

    reviewed:
      Object.freeze([
        'applied',
        'shortlisted',
        'rejected',
      ]),

    shortlisted:
      Object.freeze([
        'reviewed',
        'interview',
        'rejected',
      ]),

    interview:
      Object.freeze([
        'shortlisted',
        'offered',
        'rejected',
      ]),

    offered:
      Object.freeze([
        'interview',
        'hired',
        'rejected',
      ]),

    hired:
      Object.freeze([
        'offered',
      ]),

    rejected:
      Object.freeze([
        'reviewed',
      ]),
  });


function normalizeApplicantStatus(
  status
) {
  return String(
    status ?? ''
  )
    .trim()
    .toLowerCase();
}


function isApplicantStatus(
  status
) {
  return APPLICANT_STATUSES
    .includes(
      normalizeApplicantStatus(
        status
      )
    );
}


function canTransitionApplicantStatus(
  currentStatus,
  nextStatus
) {
  const current =
    normalizeApplicantStatus(
      currentStatus
    );

  const next =
    normalizeApplicantStatus(
      nextStatus
    );

  if (
    !isApplicantStatus(
      current
    ) ||
    !isApplicantStatus(
      next
    )
  ) {
    return false;
  }

  if (
    current ===
    next
  ) {
    return true;
  }

  return (
    APPLICANT_STATUS_TRANSITIONS[
      current
    ]?.includes(
      next
    ) ===
    true
  );
}


function getApplicantStatusLabel(
  status
) {
  const normalized =
    normalizeApplicantStatus(
      status
    );

  return (
    APPLICANT_STATUS_LABELS[
      normalized
    ] ||
    normalized
  );
}


function getApplicantAllowedTransitions(
  status
) {
  const normalized =
    normalizeApplicantStatus(
      status
    );

  if (
    !isApplicantStatus(
      normalized
    )
  ) {
    return [];
  }

  return [
    ...(
      APPLICANT_STATUS_TRANSITIONS[
        normalized
      ] ||
      []
    ),
  ];
}


function getApplicantPipelineDefinition() {
  return {
    stages:
      APPLICANT_PIPELINE_STAGES.map(
        stage => ({
          ...stage,
        })
      ),

    transitions:
      Object.fromEntries(
        Object.entries(
          APPLICANT_STATUS_TRANSITIONS
        ).map(
          ([
            status,
            transitions,
          ]) => [
            status,
            [
              ...transitions,
            ],
          ]
        )
      ),
  };
}


module.exports = {
  APPLICANT_PIPELINE_STAGES,
  APPLICANT_STATUSES,
  APPLICANT_STATUS_LABELS,
  APPLICANT_STATUS_TRANSITIONS,

  normalizeApplicantStatus,
  isApplicantStatus,
  canTransitionApplicantStatus,
  getApplicantStatusLabel,
  getApplicantAllowedTransitions,
  getApplicantPipelineDefinition,
};
