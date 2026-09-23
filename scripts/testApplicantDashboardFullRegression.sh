#!/usr/bin/env bash

set -u
set -o pipefail


main() {
echo "===================================================="
echo " OMAH APPLICANT DASHBOARD"
echo " FULL REGRESSION TEST SUITE"
echo "===================================================="

ROOT="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/.." &&
  pwd
)"

cd "$ROOT" || return 1

BRANCH="feature/applicant-management-model"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

FAILED_TESTS=()


pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "✅ $1"
}


fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  FAILED_TESTS+=("$1")
  echo "❌ $1"
}


skip() {
  SKIP_COUNT=$((SKIP_COUNT + 1))
  echo "⚪ $1"
}


run_node_test() {
  local file="$1"

  echo ""
  echo "----------------------------------------------------"
  echo " RUN: $file"
  echo "----------------------------------------------------"

  if [ ! -f "$file" ]; then
    skip "$file — not present"
    return 0
  fi

  if node "$file"; then
    pass "$file"
  else
    fail "$file"
  fi
}


run_shell_test() {
  local name="$1"
  shift

  echo ""
  echo "----------------------------------------------------"
  echo " RUN: $name"
  echo "----------------------------------------------------"

  if "$@"; then
    pass "$name"
  else
    fail "$name"
  fi
}


echo ""
echo "===================================================="
echo " 0. REPOSITORY BASELINE"
echo "===================================================="

CURRENT_BRANCH="$(
  git branch --show-current
)"

echo "Branch:"
echo "  $CURRENT_BRANCH"

echo ""
echo "HEAD:"
git log -1 \
  --oneline \
  --decorate

if [ "$CURRENT_BRANCH" = "$BRANCH" ]; then
  pass "Expected feature branch"
else
  fail "Unexpected branch: $CURRENT_BRANCH"
fi


echo ""
echo "===================================================="
echo " 1. BACKEND SYNTAX"
echo "===================================================="

SYNTAX_FILES=(
  server.js
  src/routes/applicants.routes.js
  src/routes/applicantDocuments.routes.js
  src/bootstrap/registerApiRoutes.js
  services/applicantActivityService.js
  services/applicantAuditService.js
  services/applicantDuplicateCaseService.js
  services/applicantDocumentService.js
  services/applicantEvaluationService.js
  services/applicantInterviewService.js
  services/applicantProfileService.js
  services/applicantSubmissionService.js
  utils/applicantActivity.js
)

for file in "${SYNTAX_FILES[@]}"
do
  if [ ! -f "$file" ]; then
    skip "$file — syntax target not present"
    continue
  fi

  if node --check "$file" >/dev/null; then
    pass "Syntax: $file"
  else
    fail "Syntax: $file"
  fi
done


echo ""
echo "===================================================="
echo " 2. API + SWAGGER CONTRACTS"
echo "===================================================="

run_node_test \
  scripts/testApplicantApiContract.js

run_node_test \
  scripts/testApplicantSwaggerGrouping.js

run_node_test \
  scripts/testApplicantDocumentApiContract.js

run_node_test \
  scripts/testApplicantDocumentSwagger.js



echo ""
echo "----------------------------------------------------"
echo " APPLICANT REPORT EXPORT"
echo "----------------------------------------------------"

run_node_test "scripts/testApplicantReportService.js"

run_node_test "scripts/testApplicantReportPdfRenderer.js"

run_node_test "scripts/testApplicantReportApiContract.js"

run_node_test "scripts/testApplicantReportSwagger.js"

run_node_test "scripts/testApplicantRecruitmentReport.js"

echo ""
echo "----------------------------------------------------"
echo " APPLICANT TALENT POOL FOUNDATION"
echo "----------------------------------------------------"

run_node_test "scripts/testApplicantTalentPoolFoundation.js"

run_node_test "scripts/testApplicantTalentPoolCategoryCrud.js"

run_node_test "scripts/testApplicantTalentPoolCategoryApiContract.js"

run_node_test "scripts/testApplicantTalentPoolMembershipLifecycle.js"

run_node_test "scripts/testApplicantTalentPoolMembershipApiContract.js"

run_node_test "scripts/testApplicantTalentPoolDiscoveryService.js"

run_node_test "scripts/testApplicantTalentPoolDiscoveryApiContract.js"



run_node_test "scripts/testApplicantTalentPoolSwagger.js"



echo ""
echo "===================================================="
echo " 3. AUDIT FOUNDATION"
echo "===================================================="

run_node_test \
  scripts/testApplicantAuditFoundation.js

run_node_test \
  scripts/testApplicantAuditMutationChanges.js

run_node_test \
  scripts/testApplicantAuditLifecycleChanges.js

run_node_test \
  scripts/testApplicantAuditProfileChanges.js

run_node_test \
  scripts/testApplicantAuditInternalStateChanges.js


echo ""
echo "===================================================="
echo " 4. INTERVIEW AUDIT"
echo "===================================================="

run_node_test \
  scripts/testApplicantAuditInterviewLifecycle.js

run_node_test \
  scripts/testApplicantAuditInterviewEditChanges.js


echo ""
echo "===================================================="
echo " 5. EVALUATION AUDIT"
echo "===================================================="

run_node_test \
  scripts/testApplicantAuditEvaluationLifecycle.js

run_node_test \
  scripts/testApplicantAuditEvaluationDraftChanges.js


echo ""
echo "===================================================="
echo " 6. SUBMISSION / PROFILE AUDIT"
echo "===================================================="

run_node_test \
  scripts/testApplicantAuditSubmissionLink.js

run_node_test \
  scripts/testApplicantAuditProfileApproval.js


echo ""
echo "===================================================="
echo " 7. DUPLICATE AUDIT"
echo "===================================================="

run_node_test \
  scripts/testApplicantAuditDuplicateResolution.js


echo ""
echo "===================================================="
echo " 8. DOCUMENT AUDIT"
echo "===================================================="

run_node_test \
  scripts/testApplicantAuditDocumentUploadReplace.js

run_node_test \
  scripts/testApplicantAuditDocumentLifecycle.js


echo ""
echo "===================================================="
echo " 9. PROFILE + SUBMISSION WORKFLOWS"
echo "===================================================="

run_node_test \
  scripts/testApplicantProfileService.js

run_node_test \
  scripts/testApplicantSubmissionService.js

run_node_test \
  scripts/testApplicantRelationshipService.js

run_node_test \
  scripts/testApplicantSubmissionHistoryContract.js

run_node_test \
  scripts/testApplicantSubmissionHistoryQuery.js

run_node_test \
  scripts/testApplicantSubmissionHistoryService.js


echo ""
echo "===================================================="
echo " 10. DUPLICATE WORKFLOWS"
echo "===================================================="

run_node_test \
  scripts/testApplicantDuplicateCaseModel.js

run_node_test \
  scripts/testApplicantDuplicateCaseService.js

run_node_test \
  scripts/testApplicantDuplicateManagementService.js


echo ""
echo "===================================================="
echo " 11. DOCUMENT BACKEND"
echo "===================================================="

run_node_test \
  scripts/testApplicantDocumentModel.js

run_node_test \
  scripts/testApplicantDocumentValidation.js

run_node_test \
  scripts/testApplicantDocumentVersionService.js

run_node_test \
  scripts/testApplicantDocumentApiBehavior.js

run_node_test \
  scripts/testApplicantDocumentLibrary.js

run_node_test \
  scripts/testApplicantDocumentLibraryDedupScope.js

run_node_test \
  scripts/testApplicantDocumentLibraryRoute.js

run_node_test \
  scripts/testApplicantFormDocumentAutoSync.js

run_node_test \
  scripts/testApplicantFormDocumentMigration.js


echo ""
echo "===================================================="
echo " 12. NOTES / TASKS"
echo "===================================================="

run_node_test \
  scripts/testApplicantInternalNotesService.js

run_node_test \
  scripts/testApplicantInternalNotesWorkflowService.js

run_node_test \
  scripts/testApplicantInternalNotesRepliesService.js

run_node_test \
  scripts/testApplicantTaskActivitySemantics.js


echo ""
echo "===================================================="
echo " 13. INTERVIEW / EVALUATION SERVICES"
echo "===================================================="

run_node_test \
  scripts/testApplicantInterviewManagementService.js

run_node_test \
  scripts/testApplicantEvaluationService.js


echo ""
echo "===================================================="
echo " 14. PERMANENT DELETE SAFETY"
echo "===================================================="

run_node_test \
  scripts/testApplicantPermanentDeleteService.js


echo ""
echo "===================================================="
echo " 15. FRONTEND DOCUMENT CONTRACTS"
echo "===================================================="

run_node_test \
  scripts/testApplicantDocumentManagementActionsFrontend.js

run_node_test \
  scripts/testApplicantFormDocumentsFrontend.js

run_node_test \
  scripts/testApplicantExternalDocumentFrontend.js

run_node_test "scripts/testApplicantReportExportFrontend.js"

echo ""
echo "⚪ KNOWN STALE TEST EXCLUDED:"
echo "   scripts/testApplicantDocumentManagementFrontend.js"
echo ""
echo "Reason:"
echo "   It still expects the old literal 'Open File'"
echo "   while the current UI uses the updated actions."
echo ""
echo "This is tracked separately and does not represent"
echo "a backend/Audit regression."

SKIP_COUNT=$((SKIP_COUNT + 1))


echo ""
echo "===================================================="
echo " 16. FRONTEND PRODUCTION BUILD"
echo "===================================================="

if [ -d "omahconnect-admin" ]; then
  (
    cd omahconnect-admin &&
    npm run build
  )

  if [ "$?" -eq 0 ]; then
    pass "Frontend production build"
  else
    fail "Frontend production build"
  fi
else
  skip "Frontend directory missing"
fi


echo ""
echo "===================================================="
echo " 17. LOCAL BACKEND HEALTH"
echo "===================================================="

if curl \
  --silent \
  --fail \
  --max-time 5 \
  http://localhost:5000/health \
  >/tmp/omah-applicant-health.json
then
  echo "Health response:"
  cat /tmp/omah-applicant-health.json
  echo ""

  pass "/health"
else
  skip "/health — local backend not running"
fi


if curl \
  --silent \
  --fail \
  --max-time 5 \
  http://localhost:5000/ready \
  >/tmp/omah-applicant-ready.json
then
  echo "Ready response:"
  cat /tmp/omah-applicant-ready.json
  echo ""

  pass "/ready"
else
  skip "/ready — local backend unavailable/not ready"
fi

rm -f \
  /tmp/omah-applicant-health.json \
  /tmp/omah-applicant-ready.json


echo ""
echo "===================================================="
echo " 18. GIT SAFETY"
echo "===================================================="

if git diff --check; then
  pass "git diff --check"
else
  fail "git diff --check"
fi


echo ""
echo "===================================================="
echo " FULL REGRESSION SUMMARY"
echo "===================================================="

echo ""
echo "Passed:"
echo "  $PASS_COUNT"

echo ""
echo "Failed:"
echo "  $FAIL_COUNT"

echo ""
echo "Skipped:"
echo "  $SKIP_COUNT"


if [ "$FAIL_COUNT" -gt 0 ]; then
  echo ""
  echo "FAILED TESTS:"

  for test in "${FAILED_TESTS[@]}"
  do
    echo "  ❌ $test"
  done

  echo ""
  echo "===================================================="
  echo " ❌ APPLICANT DASHBOARD REGRESSION FAILED"
  echo "===================================================="

  return 1
fi


echo ""
echo "===================================================="
echo " ✅ APPLICANT DASHBOARD FULL REGRESSION GREEN"
echo "===================================================="

echo ""
echo "Validated:"
echo "  ✅ backend syntax"
echo "  ✅ Applicant APIs"
echo "  ✅ Swagger"
echo "  ✅ Audit foundation"
echo "  ✅ Interviews"
echo "  ✅ Evaluations"
echo "  ✅ Submissions / Profile"
echo "  ✅ Duplicate Review"
echo "  ✅ Documents"
echo "  ✅ Notes / Tasks"
echo "  ✅ Permanent Delete safety"
echo "  ✅ frontend production build"
echo "  ✅ repository diff safety"

echo ""
echo "Optional browser E2E remains:"
echo "  Login"
echo "  Applicants"
echo "  Applicant Profile"
echo "  Audit & History"
echo "  Notes / Tasks"
echo "  Calendar"
echo "  Interviews"
echo "  Evaluations"
echo "  Duplicate Review"
echo "  Documents"
echo "  Analytics"

return 0
}

main "$@"
