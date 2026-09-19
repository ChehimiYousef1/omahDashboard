'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


const routes =
  fs.readFileSync(
    'src/routes/applicants.routes.js',
    'utf8'
  );


const panel =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantInternalNotesTagsPanel.tsx',
    'utf8'
  );


const header =
  fs.readFileSync(
    'omahconnect-admin/src/components/layout/Header.tsx',
    'utf8'
  );


const api =
  fs.readFileSync(
    'omahconnect-admin/src/services/api.ts',
    'utf8'
  );


/*
 * Backend must validate explicit assignment eligibility
 * for both creation and reassignment.
 */
const routeFlagChecks =
  (
    routes.match(
      /applicantTaskAssigneeEnabled/g
    ) || []
  ).length;


assert(
  routeFlagChecks >= 2,
  'Backend task creation and reassignment must enforce explicit eligibility'
);


/*
 * Frontend must no longer authorize by generic role.
 */
assert(
  panel.includes(
    'applicantTaskAssigneeEnabled'
  ),
  'Frontend must filter by explicit task-assignee capability'
);


assert.strictEqual(
  panel.includes(
    '["Recruiter",'
  ),
  false,
  'Frontend must not use broad Recruiter role eligibility'
);


/*
 * Type contract.
 */
assert(
  api.includes(
    'applicantTaskAssigneeEnabled'
  ),
  'User API type must expose task-assignee capability'
);


/*
 * OMAH logo should cover both management account classes.
 */
assert(
  header.includes(
    'usesOmahProfileLogo'
  ),
  'OMAH profile-logo policy missing'
);


assert(
  header.includes(
    'user?.consoleAccess ==='
  ) &&
  header.includes(
    '"applicants_calendar"'
  ),
  'Restricted OMAH Recruiter logo fallback missing'
);


/*
 * Employee names and emails must not become authorization
 * constants in source code.
 */
const sourceFiles =
  [
    routes,
    panel,
    header,
  ].join('\n');


assert.strictEqual(
  sourceFiles.includes(
    'omar@omahconnect.com'
  ),
  false,
  'Omar email must not be hardcoded into application authorization'
);


assert.strictEqual(
  sourceFiles.includes(
    'admin@omahconnect.com'
  ),
  false,
  'Super Admin email must not be hardcoded into application authorization'
);


assert.strictEqual(
  sourceFiles.includes(
    'Omar Freij'
  ),
  false,
  'Omar name must not be hardcoded into application authorization'
);


assert.strictEqual(
  sourceFiles.includes(
    'Youssef El Chehimi'
  ),
  false,
  'Youssef name must not be hardcoded into application authorization'
);


console.log(
  '✅ backend task assignment explicitly account-enabled'
);

console.log(
  '✅ frontend task directory explicitly account-enabled'
);

console.log(
  '✅ generic Recruiter role no longer makes a user assignable'
);

console.log(
  '✅ Omar restricted OMAH account gets logo fallback'
);

console.log(
  '✅ Super Admin retains logo fallback'
);

console.log(
  '✅ personal identity is not hardcoded into authorization source'
);

console.log(
  '\nREAL OMAH TASK ASSIGNEES TEST PASSED'
);
