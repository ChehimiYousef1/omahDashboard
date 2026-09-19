'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


const api =
  fs.readFileSync(
    'omahconnect-admin/src/services/api.ts',
    'utf8'
  );


for (
  const token of [
    '| "todo"',
    '| "in_progress"',
    '| "completed"',
    '| "cancelled"',
    'ApplicantInternalTaskPriority',
    '| "low"',
    '| "medium"',
    '| "high"',
    '| "urgent"',
    'ApplicantInternalTaskAssignee',
    'assigneeUserId?: string',
    'setApplicantInternalTaskAssignee',
    'setApplicantInternalTaskPriority',
    '/task-assignee',
    '/task-priority',
  ]
) {
  assert(
    api.includes(token),
    `Missing frontend task contract token: ${token}`
  );
}


const createFunctionStart =
  api.indexOf(
    'export const createApplicantInternalNote'
  );

const updateFunctionStart =
  api.indexOf(
    'export const updateApplicantInternalNote',
    createFunctionStart
  );

assert(
  createFunctionStart >= 0 &&
  updateFunctionStart >
    createFunctionStart
);


const createBlock =
  api.slice(
    createFunctionStart,
    updateFunctionStart
  );


assert(
  createBlock.includes(
    'priority:'
  )
);

assert(
  createBlock.includes(
    'options.priority'
  )
);

assert(
  createBlock.includes(
    'assigneeUserId:'
  )
);

assert(
  createBlock.includes(
    'options.assigneeUserId'
  )
);


console.log(
  '✅ frontend four-state task contract'
);

console.log(
  '✅ frontend priority / assignee types'
);

console.log(
  '✅ atomic task-create payload'
);

console.log(
  '✅ assignment / priority mutation APIs'
);

console.log(
  '\nAPPLICANT TASK FRONTEND API TEST PASSED'
);
