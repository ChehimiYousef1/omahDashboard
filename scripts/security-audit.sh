#!/usr/bin/env bash
# =============================================================================
#  omah-dashboard — security audit  (works in Git Bash / MINGW64 on Windows)
#  Usage:  bash scripts/security-audit.sh
#  Read-only: it reports, it never changes anything.
# =============================================================================

PASS=0; WARN=0; FAIL=0
ok()   { echo "  [OK]   $1"; PASS=$((PASS+1)); }
warn() { echo "  [WARN] $1"; WARN=$((WARN+1)); }
bad()  { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }
head2(){ echo; echo "=== $1 ==============================================="; }

SRC() { grep -rn "$1" . --include=*.js --include=*.mjs --include=*.cjs --include=*.ts --include=*.tsx \
        --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build \
        --exclude-dir=backup-before-rebase --exclude-dir=backup-mongo 2>/dev/null; }

# ----------------------------------------------------------------- 1. SECRETS
head2 "1. Secrets and .env"

if [ -f .gitignore ] && grep -qE '^\.env$|^\.env' .gitignore; then
  ok ".env is listed in .gitignore"
else
  bad ".env is NOT in .gitignore  ->  echo '.env' >> .gitignore"
fi

if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  bad ".env is CURRENTLY TRACKED by git  ->  git rm --cached .env"
else
  ok ".env is not tracked by git"
fi

HIST=$(git log --all --oneline -- .env 2>/dev/null | wc -l)
if [ "$HIST" -gt 0 ]; then
  bad ".env appears in $HIST past commit(s) — secrets are in git history, ROTATE THEM"
  echo "         git log --all --oneline -- .env"
else
  ok ".env never committed"
fi

if [ -f .env ]; then
  JS=$(grep -E '^JWT_SECRET=' .env | cut -d= -f2- | tr -d '"'"'"' \r')
  LEN=${#JS}
  case "$JS" in
    ""|your_fallback_secret_key|secret|changeme|dev|test)
      bad "JWT_SECRET is a default/placeholder value — anyone can forge admin tokens" ;;
    *) if [ "$LEN" -lt 32 ]; then
         warn "JWT_SECRET is only $LEN chars — use 64 hex chars"
       else ok "JWT_SECRET length looks fine ($LEN chars)"; fi ;;
  esac
  grep -qE '^SMTP_PASS=.+' .env && warn "SMTP_PASS present — confirm it was never shared/committed"
  grep -qE '^DISABLE_MONGO=true' .env && warn "DISABLE_MONGO=true — app is on JSON files, not MongoDB"
fi

echo "  -- hardcoded secret patterns in source:"
SRC "\(api[_-]\?key\|secret\|passwd\|password\|token\)\s*[:=]\s*['\"][A-Za-z0-9_\-]\{12,\}" \
  | grep -viE "process\.env|req\.body|req\.query|placeholder|example|\.md:" | head -15
[ $? -eq 0 ] || ok "no obvious hardcoded credentials"

echo "  -- fallback defaults that hide missing env vars:"
SRC "process\.env\.[A-Z_]* *||" | head -10

# -------------------------------------------------------------------- 2. AUTH
head2 "2. Authentication"

SIGN=$(SRC "jwt\.sign" | wc -l); VERIFY=$(SRC "jwt\.verify" | wc -l)
echo "  jwt.sign: $SIGN   jwt.verify: $VERIFY"
[ "$VERIFY" -gt 0 ] && ok "tokens are verified somewhere" || bad "no jwt.verify found — tokens may be trusted blindly"

SRC "jwt\.decode" | grep -v "jwt.verify" | head -5 | grep -q . \
  && bad "jwt.decode used — it does NOT verify the signature; use jwt.verify" \
  || ok "no unsafe jwt.decode"

SRC "ignoreExpiration" | head -3 | grep -q . && bad "ignoreExpiration found — expired tokens accepted"
SRC "expiresIn" | head -3 | grep -q . && ok "token expiry configured" || warn "no expiresIn — tokens may never expire"

echo "  -- bcrypt cost factor:"
SRC "bcrypt\.\(hash\|genSalt\)" | head -5
SRC "bcrypt\.\(hash\|genSalt\)([^,]*, *\([1-9]\|10\))" | head -3 | grep -q . \
  && warn "bcrypt rounds < 11 — use 12" || ok "bcrypt rounds look fine"

SRC "express-rate-limit\|rateLimit" | head -3 | grep -q . \
  && ok "rate limiting present" \
  || bad "NO rate limiting — login is open to brute force  ->  npm i express-rate-limit"

echo "  -- cookie flags:"
SRC "res\.cookie" | head -10
SRC "httpOnly" | head -1 | grep -q . || warn "cookies without httpOnly (readable by JS / XSS)"
SRC "sameSite" | head -1 | grep -q . || warn "cookies without sameSite (CSRF risk)"

# ----------------------------------------------------------- 3. AUTHORIZATION
head2 "3. Authorization — routes without a guard"
echo "  (routes listed below have no auth/verify/protect middleware on the same line)"
SRC "\(app\|router\)\.\(get\|post\|put\|patch\|delete\)(" \
  | grep -viE "auth|verify|protect|requireLogin|isAdmin|ensure" \
  | grep -viE "/login|/register|/health|/public" | head -25
echo "  -- role checks found:"
SRC "role\s*===\|isAdmin\|req\.user\.role" | head -8

# ----------------------------------------------------------------- 4. NETWORK
head2 "4. CORS, headers, transport"

SRC "cors(" | head -6
SRC "origin: *true\|origin: *['\"]\*" | head -3 | grep -q . \
  && bad "CORS allows any origin with credentials — lock it to your domain" \
  || ok "CORS not wide open"

SRC "helmet" | head -2 | grep -q . \
  && ok "helmet installed" \
  || warn "helmet missing — no security headers  ->  npm i helmet"

SRC "app\.use(express\.json({[^}]*limit" | head -3 | grep -q . \
  && ok "JSON body size limited" || warn "no body-size limit — DoS via huge payloads"

# ------------------------------------------------------------- 5. INJECTION
head2 "5. Injection / unsafe input"
SRC "\$where\|eval(\|new Function(" | head -5 | grep -q . && bad "eval/\$where found — code injection risk"
echo "  -- user input passed straight into queries (NoSQL injection):"
SRC "find\(req\.\|findOne(req\.\|deleteOne(req\.\|updateOne(req\." | head -10
echo "  -- path traversal risk (user input in file paths):"
SRC "path\.join([^)]*req\.\|readFileSync(req\.\|createReadStream(req\." | head -8

# ----------------------------------------------------------- 6. DEPENDENCIES
head2 "6. Dependencies"
npm audit --omit=dev 2>/dev/null | tail -12
echo "  node: $(node -v)   npm: $(npm -v)"

# -------------------------------------------------------------- 7. DATA FILES
head2 "7. Data at rest"
if [ -d data ]; then
  echo "  JSON stores in data/ (these are your database — protect them):"
  ls data/*.json 2>/dev/null | sed 's/^/    /'
  git ls-files --error-unmatch data/db.json >/dev/null 2>&1 \
    && bad "data/db.json (users + password hashes) is TRACKED BY GIT" \
    || ok "data/db.json not tracked by git"
fi
if [ -f data/db.json ]; then
  node -e "try{const u=require('./data/db.json').users||[];const w=u.filter(x=>!String(x.password||'').startsWith('\$2'));console.log(w.length?'  [FAIL] '+w.length+' user(s) with PLAINTEXT passwords':'  [OK]   all '+u.length+' passwords are bcrypt-hashed')}catch(e){console.log('  [WARN] could not read data/db.json')}"
fi
grep -qE '^(backup-mongo|data-backup)' .gitignore 2>/dev/null \
  && ok "backup folders are gitignored" \
  || warn "backup folders not gitignored — they contain full copies of your data"

# ------------------------------------------------------------------ 8. MONGO
head2 "8. MongoDB exposure"
BIND=$(netstat -ano 2>/dev/null | grep 27017 | head -3)
echo "$BIND" | sed 's/^/    /'
echo "$BIND" | grep -q "0.0.0.0:27017" \
  && bad "MongoDB is listening on ALL interfaces — bind to 127.0.0.1 only" \
  || ok "MongoDB bound to localhost only"
SRC "MONGODB_URI" | grep -i "mongodb://[^:]*:[^@]*@" | head -3 | grep -q . \
  && warn "connection string with inline credentials found in source"

# ------------------------------------------------------------------ SUMMARY
head2 "SUMMARY"
echo "  OK: $PASS    WARN: $WARN    FAIL: $FAIL"
echo
echo "  Fix every [FAIL] before deploying to AWS."
