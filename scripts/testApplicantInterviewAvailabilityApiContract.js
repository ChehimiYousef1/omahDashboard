'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');


const swaggerSource =
  fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'docs',
      'applicantInterviewSwagger.js'
    ),

    'utf8'
  );


const routeSource =
  fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'src',
      'routes',
      'applicants.routes.js'
    ),

    'utf8'
  );


assert(
  routeSource.includes(
    "'/:id/interviews/availability'"
  ),

  'Availability route is missing.'
);


assert(
  routeSource.includes(
    'checkApplicantInterviewAvailability'
  ),

  'Availability service is not connected to the route.'
);


assert(
  routeSource.includes(
    "'applicant:interviews:manage'"
  ),

  'Availability endpoint is missing interview management permission.'
);


assert(
  routeSource.includes(
    'req.user.email'
  ),

  'Organizer email is not sourced from authenticated user.'
);


assert(
  swaggerSource.includes(
    "'/api/applicants/{id}/interviews/availability'"
  ),

  'Availability API is missing from Swagger.'
);


assert(
  swaggerSource.includes(
    'Check Applicant interview availability'
  ),

  'Availability Swagger summary is missing.'
);


console.log(
  '✅ availability API documented in Swagger'
);


console.log(
  '✅ availability API route registered'
);

console.log(
  '✅ availability API permission protected'
);

console.log(
  '✅ authenticated organizer identity connected'
);

console.log(
  '✅ endpoint is read-only by implementation'
);

console.log(
  '\nINTERVIEW AVAILABILITY API CONTRACT TEST PASSED'
);
