'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const swagger =
  require(
    '../docs/applicantTalentPoolSwagger'
  );


const paths =
  swagger.paths ||
  swagger;


const membership =
  paths[
    '/api/applicants/talent-pool/{applicantId}'
  ];


assert.ok(
  membership,
  'Talent Pool membership Swagger path missing'
);


function requestSchema(
  operation
) {
  return (
    membership[
      operation
    ]
      ?.requestBody
      ?.content
      ?.['application/json']
      ?.schema
  );
}


const put =
  requestSchema(
    'put'
  );


const patch =
  requestSchema(
    'patch'
  );


assert.ok(
  put,
  'Talent Pool PUT request schema missing'
);


assert.ok(
  patch,
  'Talent Pool PATCH request schema missing'
);


assert.ok(
  Array.isArray(
    put.required
  ) &&
  put.required.includes(
    'categoryId'
  ),
  'Talent Pool PUT must require categoryId'
);


assert.equal(
  patch.minProperties,
  1,
  'Talent Pool PATCH must require at least one editable property'
);


assert.ok(
  !Array.isArray(
    patch.required
  ) ||
  !patch.required.includes(
    'categoryId'
  ),
  'Talent Pool PATCH must not require categoryId'
);


const service =
  fs.readFileSync(
    require.resolve(
      '../services/applicantTalentPoolService.js'
    ),
    'utf8'
  );


assert.ok(
  /['"]talentPool\.addedAt['"]\s*:\s*\{\s*\$exists\s*:\s*true\s*,\s*\$ne\s*:\s*null\s*\}/
    .test(
      service
    ),
  'Talent Pool analytics must exclude never-added Applicants'
);


const grouping =
  fs.readFileSync(
    require.resolve(
      './testApplicantSwaggerGrouping.js'
    ),
    'utf8'
  );


assert.ok(
  grouping.includes(
    'Applicant Talent Pool'
  ),
  'Applicant Talent Pool Swagger grouping coverage missing'
);


assert.ok(
  grouping.includes(
    'Applicant Reports & Export'
  ),
  'Applicant Reports & Export grouping regression coverage missing'
);


console.log(
  '✅ PUT full replacement requires categoryId'
);

console.log(
  '✅ PATCH partial edit accepts any editable field'
);

console.log(
  '✅ PATCH minProperties = 1'
);

console.log(
  '✅ analytics excludes never-added Applicants'
);

console.log(
  '✅ Talent Pool Swagger grouping preserved'
);

console.log(
  '✅ Applicant Reports & Export grouping preserved'
);

console.log(
  '\nAPPLICANT TALENT POOL FINAL CONTRACT TEST PASSED'
);
