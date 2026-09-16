'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


function read(
  path
) {
  return fs.readFileSync(
    path,
    'utf8'
  );
}


const profile =
  read(
    'omahconnect-admin/src/components/applicants/ApplicantProfilePanel.tsx'
  );

const panel =
  read(
    'omahconnect-admin/src/components/applicants/ApplicantInternalNotesTagsPanel.tsx'
  );

const api =
  read(
    'omahconnect-admin/src/services/api.ts'
  );

const filters =
  read(
    'omahconnect-admin/src/components/applicants/AdvancedApplicantFilters.tsx'
  );



const pipelineBoard =
  read(
    'omahconnect-admin/src/components/applicants/ApplicantPipelineBoard.tsx'
  );


assert(
  profile.includes(
    'Internal Notes, Tasks & Tags'
  )
);

assert(
  profile.includes(
    '<ApplicantInternalNotesTagsPanel'
  )
);

assert(
  panel.includes(
    'Internal recruitment information'
  )
);

assert(
  panel.includes(
    'Add Internal'
  )
);

assert(
  panel.includes(
    'Internal Notes & Tasks'
  )
);

assert(
  panel.includes(
    'Show archived'
  )
);

assert(
  panel.includes(
    'Important'
  )
);

assert(
  panel.includes(
    'Unlike'
  )
);

assert(
  panel.includes(
    'Add Reply'
  )
);

assert(
  panel.includes(
    'Dates / Reminder'
  )
);

assert(
  panel.includes(
    'Delete Permanently'
  )
);

assert(
  panel.includes(
    'Save Tags'
  )
);

assert(
  api.includes(
    'fetchApplicantInternalNotes'
  )
);

assert(
  api.includes(
    'createApplicantInternalNote'
  )
);

assert(
  api.includes(
    'updateApplicantInternalNote'
  )
);

assert(
  api.includes(
    'deleteApplicantInternalNote'
  )
);


for (
  const functionName
  of [
    'archiveApplicantInternalNote',
    'restoreApplicantInternalNote',
    'permanentlyDeleteApplicantInternalNote',
    'setApplicantInternalNoteImportance',
    'setApplicantInternalNoteLike',
    'setApplicantInternalNoteStar',
    'setApplicantInternalTaskStatus',
    'updateApplicantInternalNoteSchedule',
    'addApplicantInternalNoteToCalendar',
    'updateApplicantInternalNoteCalendar',
    'removeApplicantInternalNoteFromCalendar',
    'fetchApplicantInternalNoteReplies',
    'createApplicantInternalNoteReply',
  ]
) {
  assert(
    api.includes(
      functionName
    ),
    'Missing Notes/Tasks frontend API: ' +
      functionName
  );
}

assert(
  api.includes(
    'updateApplicantTags'
  )
);

assert(
  filters.includes(
    'All Tags'
  )
);



assert(
  pipelineBoard.includes(
    'Notes & Tasks'
  )
);

assert(
  pipelineBoard.includes(
    'Internal Notes & Tasks'
  )
);

assert(
  pipelineBoard.includes(
    'Quick Note'
  )
);

assert(
  pipelineBoard.includes(
    'Quick Task'
  )
);

assert(
  pipelineBoard.includes(
    'Loading notes and tasks'
  )
);

assert(
  pipelineBoard.includes(
    'note.schedule'
  )
);


for (
  const calendarLabel
  of [
    'Add to Calendar',
    'Update Calendar',
    'Open Calendar',
    'Remove from Calendar',
    'Needs update',
  ]
) {
  assert(
    panel.includes(
      calendarLabel
    ),
    'Missing Calendar UI: ' +
      calendarLabel
  );
}

assert(
  panel.includes(
    'Archived Applicant — Calendar cleanup:'
  )
);

console.log(
  '✅ explicit Google Calendar controls connected'
);

console.log(
  '✅ Internal Notes, Tasks & Tags panel integrated'
);

console.log(
  '✅ Notes/Tasks workflow frontend API connected'
);

console.log(
  '✅ existing Applicant tag filtering reused'
);


console.log(
  '✅ pipeline card shows Notes/Tasks workflow'
);

console.log(
  '\nAPPLICANT INTERNAL NOTES, TASKS & TAGS FRONTEND TEST PASSED'
);
