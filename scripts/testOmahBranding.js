'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


const logoPath =
  'omahconnect-admin/public/branding/omah-logo.svg';

const loginPath =
  'omahconnect-admin/src/pages/LoginPage.tsx';

const sidebarPath =
  'omahconnect-admin/src/components/layout/Sidebar.tsx';

const headerPath =
  'omahconnect-admin/src/components/layout/Header.tsx';


assert(
  fs.existsSync(
    logoPath
  ),
  'OMAH logo asset missing'
);


const logo =
  fs.readFileSync(
    logoPath,
    'utf8'
  );

const login =
  fs.readFileSync(
    loginPath,
    'utf8'
  );

const sidebar =
  fs.readFileSync(
    sidebarPath,
    'utf8'
  );

const header =
  fs.readFileSync(
    headerPath,
    'utf8'
  );


assert(
  logo.includes(
    '<svg'
  ),
  'OMAH asset must be SVG'
);


assert(
  login.includes(
    'src="/branding/omah-logo.svg"'
  ),
  'Login must display OMAH logo'
);


assert(
  login.includes(
    'alt="OMAHCONNECT"'
  ),
  'Login logo needs accessible text'
);


assert(
  sidebar.includes(
    'src="/branding/omah-logo.svg"'
  ),
  'Sidebar must display OMAH logo'
);


assert(
  sidebar.includes(
    'brightness-0 invert'
  ),
  'Dark sidebar must render logo visibly'
);


assert.strictEqual(
  sidebar.includes(
    'InfinityIcon'
  ),
  false,
  'Legacy Infinity dashboard logo must be removed'
);


assert(
  header.includes(
    'const isSuperAdmin'
  ),
  'Super Admin fallback detection missing'
);


const headerLogoUses =
  (
    header.match(
      /\/branding\/omah-logo\.svg/g
    ) || []
  ).length;


assert(
  headerLogoUses >= 2,
  'Header must use OMAH logo in both Super Admin avatar positions'
);


/*
 * Personal profile photo must retain priority.
 */
assert(
  header.includes(
    'user?.avatar ? ('
  ),
  'Personal avatar precedence missing'
);


/*
 * Non-Super-Admin users still use initials.
 */
assert(
  header.includes(
    '.substring('
  ),
  'Initials fallback missing'
);


/*
 * Never tie branding to named employees.
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
  '✅ OMAH SVG asset present'
);

console.log(
  '✅ Login branding'
);

console.log(
  '✅ Dashboard/sidebar branding'
);

console.log(
  '✅ Super Admin default brand avatar'
);

console.log(
  '✅ uploaded personal avatar has priority'
);

console.log(
  '✅ non-Super-Admin initials fallback preserved'
);

console.log(
  '✅ no employee identity hardcoding'
);

console.log(
  '\nOMAH BRANDING TEST PASSED'
);
