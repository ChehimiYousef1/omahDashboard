#!/usr/bin/env bash
# =============================================================================
#  Print the project structure, ignoring noise.
#  Usage:  bash scripts/tree.sh          (depth 3, the readable default)
#          bash scripts/tree.sh 2        (shallower)
#          bash scripts/tree.sh 99       (everything)
#          bash scripts/tree.sh 3 > STRUCTURE.md
# =============================================================================

DEPTH="${1:-3}"

IGNORE=(
  node_modules .git dist dist-ssr build coverage
  backup-mongo backup-before-rebase .vite .cache
)

PRUNE=()
for d in "${IGNORE[@]}"; do PRUNE+=( -name "$d" -o ); done
PRUNE+=( -name 'data-backup-*' )

echo "$(basename "$PWD")/"

find . -maxdepth "$DEPTH" \( "${PRUNE[@]}" \) -prune -o -print 2>/dev/null \
  | grep -v '^\.$' \
  | sort \
  | sed -e 's|^\./||' \
        -e 's|[^/]*/|    |g' \
        -e 's|^|  |'

echo
echo "--- counts (excluding ignored dirs) ---"
find . \( "${PRUNE[@]}" \) -prune -o -type f -print 2>/dev/null | wc -l | xargs echo "files:"
find . \( "${PRUNE[@]}" \) -prune -o -type d -print 2>/dev/null | wc -l | xargs echo "dirs: "
echo
echo "--- largest source files ---"
find . \( "${PRUNE[@]}" \) -prune -o -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) -print 2>/dev/null \
  | xargs ls -l 2>/dev/null | sort -k5 -rn | head -10 | awk '{printf "  %8.1f KB  %s\n", $5/1024, $9}'
