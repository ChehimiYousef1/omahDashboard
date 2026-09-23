'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const activityUtils =
  require(
    '../utils/applicantActivity'
  );

const talentPoolRouter =
  require(
    '../src/routes/applicantTalentPool.routes'
  );


const categories =
  activityUtils
    .APPLICANT_ACTIVITY_CATEGORIES ||
  [];


const types =
  activityUtils
    .APPLICANT_ACTIVITY_TYPES ||
  [];


assert.ok(
  categories.includes(
    'talent_pool'
  ),
  'Talent Pool activity category missing'
);


for (
  const type
  of [
    'talent_pool.added',
    'talent_pool.updated',
    'talent_pool.removed',
    'talent_pool.restored',
    'talent_pool.review_completed',
    'talent_pool.review_scheduled',
  ]
) {
  assert.ok(
    types.includes(
      type
    ),
    `Talent Pool Audit type missing: ${type}`
  );
}


const {
  talentPoolAuditSnapshot,
  talentPoolAuditChanges,
  talentPoolAuditDescriptor,
} =
  talentPoolRouter;


assert.equal(
  typeof talentPoolAuditSnapshot,
  'function',
  'Talent Pool Audit snapshot helper missing'
);


assert.equal(
  typeof talentPoolAuditChanges,
  'function',
  'Talent Pool Audit change helper missing'
);


assert.equal(
  talentPoolAuditDescriptor(
    'POST',
    '/'
  )?.type,
  'talent_pool.added'
);


assert.equal(
  talentPoolAuditDescriptor(
    'PATCH',
    '/'
  )?.type,
  'talent_pool.updated'
);


assert.equal(
  talentPoolAuditDescriptor(
    'DELETE',
    '/'
  )?.type,
  'talent_pool.removed'
);


assert.equal(
  talentPoolAuditDescriptor(
    'POST',
    '/restore'
  )?.type,
  'talent_pool.restored'
);


assert.equal(
  talentPoolAuditDescriptor(
    'POST',
    '/review'
  )?.type,
  'talent_pool.review_completed'
);


assert.equal(
  talentPoolAuditDescriptor(
    'POST',
    '/review/schedule'
  )?.type,
  'talent_pool.review_scheduled'
);


const before =
  talentPoolAuditSnapshot({
    talentPool: {
      active: false,
      reason:
        '',
    },
  });


const after =
  talentPoolAuditSnapshot({
    talentPool: {
      active: true,
      priority:
        'high',
      roles: [
        'Backend Developer',
      ],
      reason:
        'private text after',
      nextReviewAt:
        '2027-01-01T10:00:00.000Z',
    },
  });


const changes =
  talentPoolAuditChanges(
    before,
    after
  );


const serialized =
  JSON.stringify(
    changes
  );


const privateSnapshot =
  JSON.stringify(
    talentPoolAuditSnapshot({
      talentPool: {
        reason:
          'private text before',
      },
    })
  );


assert.ok(
  serialized.includes(
    'talentPool.active'
  ),
  'Membership active change missing'
);


assert.ok(
  serialized.includes(
    'talentPool.reasonProvided'
  ),
  'Safe reasonProvided Audit indicator missing'
);


assert.ok(
  !privateSnapshot.includes(
    'private text before'
  ),
  'Private Talent Pool reason leaked from Audit snapshot'
);


assert.ok(
  !serialized.includes(
    'private text after'
  ),
  'Private Talent Pool reason leaked to Audit'
);


const routeSource =
  fs.readFileSync(
    require.resolve(
      '../src/routes/applicantTalentPool.routes.js'
    ),
    'utf8'
  );


assert.ok(
  routeSource.includes(
    'recordApplicantActivity'
  ),
  'Existing Applicant activity recorder not reused'
);


assert.ok(
  routeSource.includes(
    "'talent_pool'"
  ),
  'Talent Pool Audit source provenance missing'
);


const frontend =
  fs.readFileSync(
    require.resolve(
      '../omahconnect-admin/src/components/applicants/ApplicantActivityPanel.tsx'
    ),
    'utf8'
  );


assert.ok(
  frontend.includes(
    'talent_pool'
  ),
  'Talent Pool Audit filter missing from existing history UI'
);


assert.ok(
  frontend.includes(
    'Talent Pool'
  ),
  'Talent Pool Audit filter label missing'
);


console.log(
  '✅ Talent Pool Audit category registered'
);

console.log(
  '✅ six Talent Pool Audit event types registered'
);

console.log(
  '✅ membership before → after changes'
);

console.log(
  '✅ review lifecycle Audit events'
);

console.log(
  '✅ free-text reason excluded from Audit'
);

console.log(
  '✅ existing ApplicantActivity infrastructure reused'
);

console.log(
  '✅ existing Audit & History UI includes Talent Pool filter'
);

console.log(
  '\nAPPLICANT TALENT POOL AUDIT TEST PASSED'
);
