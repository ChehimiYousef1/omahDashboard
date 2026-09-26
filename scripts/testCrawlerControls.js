'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');


function read(relativePath) {
  return fs.readFileSync(
    path.join(
      __dirname,
      '..',
      relativePath
    ),
    'utf8'
  );
}


const robots =
  read(
    'omahconnect-admin/public/robots.txt'
  );

assert.match(
  robots,
  /User-agent:\s*\*/
);

assert.match(
  robots,
  /Disallow:\s*\//
);

for (
  const crawler
  of [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-User',
    'Claude-SearchBot',
    'CCBot',
    'Google-Extended',
  ]
) {
  assert.ok(
    robots.includes(
      `User-agent: ${crawler}`
    ),
    `Missing robots rule for ${crawler}`
  );
}

console.log(
  '✅ robots.txt crawl denial'
);


const indexHtml =
  read(
    'omahconnect-admin/index.html'
  );

assert.match(
  indexHtml,
  /<meta name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex"\s*\/>/
);

console.log(
  '✅ HTML noindex meta'
);


const middleware =
  read(
    'src/bootstrap/configureMiddleware.js'
  );

assert.match(
  middleware,
  /P8 BOT \/ AI CRAWLER CONTROLS/
);

assert.match(
  middleware,
  /'X-Robots-Tag'/
);

assert.match(
  middleware,
  /noindex, nofollow, noarchive, nosnippet, noimageindex/
);

assert.match(
  middleware,
  /req\.path ===\s*'\/robots\.txt'/
);

assert.match(
  middleware,
  /!isProduction/
);

for (
  const crawler
  of [
    'gptbot',
    'oai-searchbot',
    'chatgpt-user',
    'claudebot',
    'claude-user',
    'claude-searchbot',
    'ccbot',
    'perplexitybot',
    'bytespider',
    'googlebot',
    'bingbot',
  ]
) {
  assert.ok(
    middleware.includes(
      `'${crawler}'`
    ),
    `Missing runtime crawler token: ${crawler}`
  );
}

assert.match(
  middleware,
  /CRAWLER_BLOCKED/
);

console.log(
  '✅ production crawler User-Agent block contract'
);


const vite =
  read(
    'omahconnect-admin/vite.config.ts'
  );

assert.match(
  vite,
  /sourcemap:\s*false/
);

console.log(
  '✅ production source maps remain disabled'
);


console.log('');
console.log(
  'P8 CRAWLER CONTROL CONTRACT TEST PASSED'
);
