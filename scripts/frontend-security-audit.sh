#!/usr/bin/env bash
# =============================================================================
#  omahconnect-admin — FRONT-END security audit (OWASP-aligned, client side)
#  Run from inside the omahconnect-admin folder:
#      bash frontend-security-audit.sh
#  Read-only. It reports; it never changes a file.
# =============================================================================

PASS=0; WARN=0; FAIL=0
ok()   { echo "  [OK]   $1"; PASS=$((PASS+1)); }
warn() { echo "  [WARN] $1"; WARN=$((WARN+1)); }
bad()  { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }
sec()  { echo; echo "=== $1 ==============================================="; }
S()    { grep -rn "$1" src/ 2>/dev/null; }

[ -d src ] || { echo "Run this from inside omahconnect-admin (no src/ here)"; exit 1; }

# ------------------------------------------------- A01: token storage / session
sec "A01  Session token storage"
if S "localStorage\|sessionStorage" | grep -iE "token|jwt|auth|secret|password" | head -10 | grep -q .; then
  bad "auth token kept in localStorage/sessionStorage — readable by any XSS payload"
  S "localStorage\|sessionStorage" | grep -iE "token|jwt|auth|secret|password" | head -10
else
  ok "no auth token in web storage (httpOnly cookie is the right pattern)"
fi
echo "  -- everything stored client-side:"
S "localStorage\.\|sessionStorage\." | head -12
S "withCredentials" | head -3 | grep -q . && ok "withCredentials set (cookie auth works cross-origin)" \
  || warn "withCredentials not found — cookie-based auth will 401"

# --------------------------------------------------------------- A03: XSS sinks
sec "A03  XSS sinks"
S "dangerouslySetInnerHTML" | head -10 | grep -q . \
  && { bad "dangerouslySetInnerHTML used — every one of these needs sanitising (DOMPurify)"; S "dangerouslySetInnerHTML" | head -10; } \
  || ok "no dangerouslySetInnerHTML"
S "\.innerHTML *=" | head -5 | grep -q . && bad "direct innerHTML assignment found"
S "eval(\|new Function(\|setTimeout(['\"]" | head -5 | grep -q . && bad "eval / string-timer found — code injection sink"
S "document\.write" | head -3 | grep -q . && bad "document.write found"
[ $FAIL -eq 0 ] && ok "no eval/innerHTML/document.write sinks"

# --------------------------------------------- A02: secrets shipped to browser
sec "A02  Secrets in the client bundle"
echo "  -- VITE_ variables (ALL of these are public, they are baked into the JS):"
cat .env .env.production .env.local 2>/dev/null | grep -v '^#' | grep . | sed 's/^/    /'
cat .env .env.production .env.local 2>/dev/null \
  | grep -iE "secret|password|api_key|apikey|token|private" | grep -q . \
  && bad "a secret-looking value sits in a VITE_ env file — anyone can read it in DevTools" \
  || ok "no secret-looking values in env files"

echo "  -- hardcoded credential patterns in src/:"
S "\(password\|passwd\|secret\|api[_-]\?key\|bearer \)['\"]\?\s*[:=]\s*['\"][^'\"]\{8,\}" \
  | grep -viE "type=|placeholder|label|name=|autocomplete" | head -10
S "sk-[A-Za-z0-9]\{16,\}\|AIza[A-Za-z0-9_-]\{20,\}\|ghp_[A-Za-z0-9]\{20,\}" | head -5 | grep -q . \
  && bad "live-looking API key hardcoded in source"

if [ -d dist ]; then
  echo "  -- scanning built bundle:"
  grep -ohE "(sk-[A-Za-z0-9]{16,}|AIza[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,})" dist/assets/*.js 2>/dev/null | head -5 \
    | grep -q . && bad "API key found INSIDE dist/ — it is already shipped to users"
  ls dist/assets/*.map >/dev/null 2>&1 \
    && bad "source maps (.map) in dist/ — your full source is downloadable in production" \
    || ok "no source maps in dist/"
fi

# ------------------------------------------------- A01: client-side authorization
sec "A01  Route protection (UI-side)"
S "ProtectedRoute\|PrivateRoute\|RequireAuth\|isAuthenticated\|useAuth" | head -8
S "ProtectedRoute\|PrivateRoute\|RequireAuth" | head -1 | grep -q . \
  && ok "a route guard component exists" \
  || warn "no route guard found — pages may render before auth is known"
echo
echo "  NOTE: front-end guards are UX only. Every endpoint must re-check auth"
echo "  server-side. Hiding a button does not protect the API behind it."
echo "  -- role checks in the UI:"
S "role *===\|isAdmin\|user\.role" | head -8

# ------------------------------------------------------- dangerous dev surfaces
sec "Developer / debug surfaces exposed in production"
if [ -f src/pages/DeveloperToolsPage.tsx ]; then
  bad "DeveloperToolsPage ships in the bundle — it can call arbitrary API endpoints"
  echo "         Gate it behind an admin role AND behind import.meta.env.DEV,"
  echo "         or exclude it from the production build entirely."
fi
CL=$(S "console\.\(log\|debug\|info\)" | wc -l)
[ "$CL" -gt 0 ] && warn "$CL console.* calls — they leak data in production DevTools" \
                || ok "no console noise"
echo "  -- calls that log objects (highest leak risk):"
S "console\.log(.*\(user\|token\|password\|response\|data\)" | head -8

# ---------------------------------------------------------- transport / linking
sec "Transport and outbound links"
S "http://" | grep -v "localhost\|127.0.0.1\|www.w3.org\|schema" | head -8 | grep -q . \
  && { bad "plain http:// URL in source — mixed content will be blocked on an https site"; \
       S "http://" | grep -v "localhost\|127.0.0.1\|www.w3.org\|schema" | head -8; } \
  || ok "no insecure external URLs"
S "target=[\"']_blank" | head -10 | grep -q . && {
  UNSAFE=$(S "target=[\"']_blank" | grep -v "noopener" | wc -l)
  [ "$UNSAFE" -gt 0 ] && warn "$UNSAFE _blank link(s) without rel=\"noopener noreferrer\" (tabnabbing)" \
                      || ok "all _blank links carry rel=noopener"
}

# ------------------------------------------------------------- forms / inputs
sec "Forms and credential inputs"
S "type=[\"']password" | head -5
S "autocomplete=[\"']off" | head -3 | grep -q . && warn "autocomplete=off on inputs — hurts password managers, no security gain"
S "<form" | head -3 | grep -q . && echo "  (check that submits are handled in JS, not native GET which puts data in the URL)"

# ------------------------------------------------------------- error handling
sec "Error handling / 401 flow"
S "interceptors" | head -5
S "interceptors\.response" | head -1 | grep -q . \
  && ok "response interceptor present (can force logout on 401)" \
  || warn "no response interceptor — expired sessions will fail silently per request"
S "catch *(.*) *{ *}" | head -3 | grep -q . && warn "empty catch block(s) — errors swallowed"

# ------------------------------------------------------------- dependencies
sec "Dependencies"
npm audit --omit=dev 2>/dev/null | tail -6
echo "  -- lockfile:"
[ -f package-lock.json ] && ok "package-lock.json present (reproducible installs)" \
                         || bad "no lockfile — builds are not reproducible"

# ------------------------------------------------------------- build config
sec "Build configuration"
grep -n "sourcemap" vite.config.ts 2>/dev/null | sed 's/^/    /'
grep -q "sourcemap: *true" vite.config.ts 2>/dev/null \
  && bad "sourcemap: true — do not ship source maps to production"
grep -n "Content-Security-Policy" index.html 2>/dev/null | sed 's/^/    /'
grep -q "Content-Security-Policy" index.html 2>/dev/null \
  && ok "CSP meta tag in index.html" \
  || warn "no CSP — set it on the server (nginx/helmet) instead of a meta tag"

# ------------------------------------------------------------------ SUMMARY
sec "SUMMARY"
echo "  OK: $PASS    WARN: $WARN    FAIL: $FAIL"
echo
echo "  This covers what static analysis can see. The manual checks that"
echo "  matter most are in the browser — see the DevTools checklist."
