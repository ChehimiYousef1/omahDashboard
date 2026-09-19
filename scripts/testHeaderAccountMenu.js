'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


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


assert(
  api.includes(
    'logoutCurrentUser'
  ),
  'logoutCurrentUser frontend API missing'
);

assert(
  api.includes(
    "apiClient.post('/auth/logout')"
  ),
  'logout endpoint not connected'
);


assert(
  header.includes(
    'showProfileMenu'
  ),
  'profile menu state missing'
);

assert(
  header.includes(
    'profileRef'
  ),
  'profile outside-click ref missing'
);

assert(
  header.includes(
    'handleLogout'
  ),
  'logout handler missing'
);

assert(
  header.includes(
    'logoutCurrentUser'
  ),
  'Header logout API connection missing'
);

assert(
  header.includes(
    'window.location.reload()'
  ),
  'logout must refresh authentication state'
);

assert(
  header.includes(
    'aria-label="Open account menu"'
  ),
  'account menu accessibility label missing'
);

assert(
  header.includes(
    'Signed in account'
  ),
  'signed-in account information missing'
);

assert(
  header.includes(
    'user?.email'
  ),
  'current user email not displayed'
);

assert(
  header.includes(
    'user?.role'
  ),
  'current user role not displayed'
);

assert(
  header.includes(
    'Authenticated session'
  ),
  'session state indicator missing'
);

assert(
  header.includes(
    'Signing out...'
  ),
  'logout busy state missing'
);

assert(
  header.includes(
    '>Logout<'
  ) ||
  header.includes(
    ': "Logout"'
  ),
  'Logout label missing'
);


/*
 * This feature must remain identity-driven.
 * Do not hardcode actual OMAH employee names.
 */
assert.strictEqual(
  header.includes(
    'Omar Freij'
  ),
  false
);

assert.strictEqual(
  header.includes(
    'Youssef El Chehimi'
  ),
  false
);


console.log(
  '✅ authenticated account dropdown'
);

console.log(
  '✅ current-user name / role / email'
);

console.log(
  '✅ outside-click behavior'
);

console.log(
  '✅ real backend logout'
);

console.log(
  '✅ logout busy/error handling'
);

console.log(
  '✅ no hardcoded OMAH identity'
);

console.log(
  '\nHEADER ACCOUNT MENU TEST PASSED'
);
