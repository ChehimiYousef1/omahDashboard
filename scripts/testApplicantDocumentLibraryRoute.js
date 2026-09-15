'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const routeSource =
  fs.readFileSync(
    'src/routes/applicants.routes.js',
    'utf8'
  );

const swaggerSource =
  fs.readFileSync(
    'docs/applicantSwagger.js',
    'utf8'
  );


assert(
  routeSource.includes(
    "'/documents/library'"
  )
);

console.log(
  '✅ document library route registered'
);


const routeIndex =
  routeSource.indexOf(
    "'/documents/library'"
  );

const genericIndex =
  routeSource.lastIndexOf(
    "'/:id'"
  );

assert(
  routeIndex >= 0 &&
  genericIndex >= 0 &&
  routeIndex <
    genericIndex
);

console.log(
  '✅ document library route ordered before /:id'
);


const surrounding =
  routeSource.slice(
    Math.max(
      0,
      routeIndex - 300
    ),
    routeIndex + 500
  );

assert(
  surrounding.includes(
    "'applicant:documents:view'"
  )
);

console.log(
  '✅ dedicated document-view permission required'
);


assert(
  swaggerSource.includes(
    "'/api/applicants/documents/library'"
  )
);

console.log(
  '✅ document library Swagger documented'
);


console.log(
  '\nAPPLICANT DOCUMENT LIBRARY ROUTE TEST PASSED'
);
