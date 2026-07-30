#!/usr/bin/env bash
# =============================================================================
#  omah-dashboard — organize into a professional layout
#  Usage:  bash scripts/organize.sh           <- DRY RUN, changes nothing
#          bash scripts/organize.sh --apply   <- actually moves/creates
#
#  Philosophy: ARCHIVE, don't delete. Notes go to docs/archive/ so nothing
#  is lost. Only true build junk is removed.
#  NEVER touches: data/  .env  node_modules/  package*.json  src/
# =============================================================================
set -uo pipefail

APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1
run() { if [ "$APPLY" = "1" ]; then eval "$1"; else echo "      $1"; fi; }
group() { echo; echo "=== $1 ==============================================="; }

[ -f server.js ] || { echo "Run this from the project root (server.js not found)"; exit 1; }

[ "$APPLY" = "1" ] && echo ">>> APPLYING" || echo ">>> DRY RUN — add --apply to run for real"

# --------------------------------------------------------------------------
group "1. Archive the loose notes  ->  docs/archive/"
DOCS=(
  "✅_READ_ME_FIRST.md" COLUMN_NAMES_REFERENCE.md COMPLETE_GUIDE.md
  COMPLETE_SERVER_JS.md FILES_CREATED.md FIX_SUMMARY.md INDEX.md
  INTEGRATION_SUMMARY.txt QUICK_START.txt README_FIX.txt SETUP.md
  START_HERE_MONGODB.md STRUCTURE.md SERVER_UPDATES.md README_MONGODB.md
)
FOUND=0
run "mkdir -p docs/archive"
for f in "${DOCS[@]}"; do
  [ -e "$f" ] && { echo "  archive: $f"; run "mv '$f' docs/archive/"; FOUND=$((FOUND+1)); }
done
for f in MONGODB_*.md MONGODB_*.txt; do
  [ -e "$f" ] && { echo "  archive: $f"; run "mv '$f' docs/archive/"; FOUND=$((FOUND+1)); }
done
[ "$FOUND" = "0" ] && echo "  (nothing)" || echo "  -> $FOUND file(s) leaving the root"

# --------------------------------------------------------------------------
group "2. One place for scripts  ->  scripts/"
for f in security-audit.sh; do
  [ -f "$f" ] && [ -f "scripts/$f" ] && { echo "  duplicate at root, removing: $f"; run "rm -f '$f'"; }
  [ -f "$f" ] && [ ! -f "scripts/$f" ] && { echo "  move: $f"; run "mv '$f' scripts/"; }
done
[ -f omahconnect-admin/frontend-security-audit.sh ] && {
  echo "  move: omahconnect-admin/frontend-security-audit.sh"
  run "mv omahconnect-admin/frontend-security-audit.sh scripts/"; }

echo "  -- spent one-off patch scripts (their job is done):"
for f in scripts/fix-fallbacks.js scripts/harden.js omahconnect-admin/fix-api-base.js; do
  [ -f "$f" ] && { echo "     rm $f"; run "rm -f '$f'"; }
done

# --------------------------------------------------------------------------
group "3. Mongoose models  ->  models/"
MODELS=(Application.js Company.js Job.js)
PRESENT=()
for m in "${MODELS[@]}"; do [ -f "$m" ] && PRESENT+=("$m"); done

if [ ${#PRESENT[@]} -eq 0 ]; then
  echo "  (already moved or not present)"
else
  echo "  current require() references:"
  for m in "${PRESENT[@]}"; do
    base="${m%.js}"
    grep -rn "require('\./$base'\|require(\"\./$base\"\|require('\./$base\.js'" \
      --include=*.js . --exclude-dir=node_modules --exclude-dir=models 2>/dev/null | sed 's/^/     /'
  done
  run "mkdir -p models"
  for m in "${PRESENT[@]}"; do echo "  move: $m -> models/$m"; run "git mv '$m' models/ 2>/dev/null || mv '$m' models/"; done

  echo "  rewrite require paths:"
  if [ "$APPLY" = "1" ]; then
    for m in "${PRESENT[@]}"; do
      base="${m%.js}"
      grep -rl "require('\./$base'\|require(\"\./$base\"" --include=*.js . \
        --exclude-dir=node_modules --exclude-dir=models 2>/dev/null \
        | while read -r file; do
            sed -i "s|require('\./$base'|require('./models/$base'|g; s|require(\"\./$base\"|require(\"./models/$base\"|g" "$file"
            echo "     patched $file"
          done
      # files now inside models/ referencing siblings keep working as ./X
    done
  else
    echo "      (sed on every file that requires them)"
  fi
fi

# --------------------------------------------------------------------------
group "4. Stray files worth a look (NOT touched automatically)"
for f in query test-server.js start-server.bat vercel.json; do
  [ -e "$f" ] && printf "  %-22s %s\n" "$f" "$( [ -f "$f" ] && du -h "$f" | cut -f1 )"
done
echo "  'query'        — looks like an accidental shell redirect; open it, then delete"
echo "  test-server.js — keep only if you actually run it"
echo "  vercel.json    — you're deploying to AWS now; stale if Vercel is dropped"

if [ -d mongodb ]; then
  SZ=$(du -sh mongodb 2>/dev/null | cut -f1)
  echo
  echo "  mongodb/  ($SZ)  <-- a full MongoDB install inside your repo"
  echo "     MongoDB now runs as a Windows service from C:\\Program Files,"
  echo "     so this copy is dead weight. Delete manually once you're sure:"
  echo "     rm -rf mongodb   (and check scripts/start-mongodb.ps1 doesn't point at it)"
fi

# --------------------------------------------------------------------------
group "5. README"
if [ ! -f README.md ]; then
  echo "  create: README.md"
  if [ "$APPLY" = "1" ]; then
cat > README.md <<'MD'
# OMAH Connect — Admin Dashboard

Express + MongoDB back end with a React (Vite) admin console.

## Layout

    server.js              API entry point
    models/                Mongoose models
    middleware/            auth
    data/                  JSON stores (companies, jobs, emails, users…)
    scripts/               ops: backup, audits, structure, cleanup
    omahconnect-admin/     React admin front end
    docs/archive/          historical setup notes

## Requirements

Node 20+, MongoDB 8 running locally (or an Atlas connection string).

## Setup

    npm install
    cp .env.example .env        # then fill it in
    npm start                   # API on :5000

    cd omahconnect-admin
    npm install
    npm run dev                 # UI on :5173

## Environment

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Mongo connection string (required) |
| `DISABLE_MONGO` | `true` falls back to JSON files |
| `JWT_SECRET` | 64 hex chars, required |
| `PORT` | API port, default 5000 |
| `SMTP_*` | outbound email |
| `APPLICANT_SHEET_CSV_URL` | Google Sheet import |

Front end: `VITE_API_URL` in `omahconnect-admin/.env` (and `.env.production`).

## Useful commands

    npm run backup      # Mongo + data/ snapshot
    npm run tree        # project structure
    npm run clean       # remove build junk (dry run first)
    bash scripts/security-audit.sh
MD
  fi
else
  echo "  README.md already exists — left alone"
fi

# --------------------------------------------------------------------------
group "DONE"
[ "$APPLY" = "1" ] && {
  echo "  Now verify nothing broke:"
  echo "     npm start"
  echo "     cd omahconnect-admin && npm run build"
} || echo "  Re-run with --apply when the plan above looks right."
