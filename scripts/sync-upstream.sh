#!/usr/bin/env bash
set -euo pipefail

# sync-upstream.sh — Semi-automated upstream sync for qwen-lyra fork
#
# Rebases the lyra branch onto origin/main and auto-resolves
# known rename conflicts (qwen-code → qwen-lyra).
#
# Usage:
#   sync-upstream.sh [OPTIONS]
#
# Options:
#   --dry-run          Show what would happen without making changes
#   --no-auto-resolve  Skip automatic rename resolution, report all conflicts
#   --upstream REF     Upstream ref to rebase onto (default: origin/main)
#   --help             Show this help

DRY_RUN=false
NO_AUTO_RESOLVE=false
UPSTREAM_REF="origin/main"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)         DRY_RUN=true; shift ;;
    --no-auto-resolve) NO_AUTO_RESOLVE=true; shift ;;
    --upstream)        UPSTREAM_REF="$2"; shift 2 ;;
    --help|-h)
      echo "Usage: sync-upstream.sh [--dry-run] [--no-auto-resolve] [--upstream REF]"
      echo ""
      echo "Semi-automated upstream sync for the qwen-lyra fork."
      echo "Rebases lyra onto upstream and auto-resolves rename conflicts."
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

RENAME_FILES=(
  'package.json'
  'packages/cli/package.json'
  'packages/core/package.json'
  'scripts/create-standalone-package.js'
  'scripts/installation/install-qwen-standalone.sh'
  'scripts/installation/install-qwen-with-source.sh'
  'scripts/installation/uninstall-qwen-standalone.sh'
  'scripts/installation/INSTALLATION_GUIDE.md'
)

# Rename patterns: s/UPSTREAM/FORK/g
RENAME_PATTERNS=(
  's/@qwen-code\/qwen-code/@qwen-code\/qwen-lyra/g'
  's/"qwen"/"qwen-lyra"/g'
  's/qwen-code-/qwen-lyra-/g'
)

echo "=== qwen-lyra upstream sync ==="
echo "Upstream ref: ${UPSTREAM_REF}"
echo "Current branch: $(git branch --show-current)"
echo ""

# Step 1: Fetch upstream
echo ">>> Fetching upstream..."
git fetch origin main

# Check how many commits would be rebased
COMMITS_BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0")
COMMITS_AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
echo "    Behind upstream: ${COMMITS_BEHIND} commits"
echo "    Ahead of upstream: ${COMMITS_AHEAD} commits"

if [[ "${COMMITS_BEHIND}" == "0" ]]; then
  echo "Already up-to-date. Nothing to sync."
  exit 0
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  echo ""
  echo "[DRY RUN] Would rebase $(git branch --show-current) onto ${UPSTREAM_REF}"
  echo ""
  echo "Files that would get auto-rename treatment:"
  for f in "${RENAME_FILES[@]}"; do
    echo "  - ${f}"
  done
  echo ""
  echo "Rename patterns that would be applied:"
  for p in "${RENAME_PATTERNS[@]}"; do
    echo "  - ${p}"
  done
  exit 0
fi

# Step 2: Create sync branch
SYNC_BRANCH="sync-upstream-$(date +%Y%m%d)"
CURRENT_BRANCH=$(git branch --show-current)
echo ">>> Creating sync branch: ${SYNC_BRANCH}"
git checkout -b "${SYNC_BRANCH}"

# Step 3: Attempt rebase
echo ">>> Rebasing onto ${UPSTREAM_REF}..."
REBASE_RESULT=0
git rebase "${UPSTREAM_REF}" || REBASE_RESULT=$?

if [[ ${REBASE_RESULT} -ne 0 ]]; then
  CONFLICTED=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
  CONFLICT_COUNT=$(echo "${CONFLICTED}" | grep -c . || true)

  echo ""
  echo ">>> ${CONFLICT_COUNT} conflicts detected"

  if [[ "${NO_AUTO_RESOLVE}" == "false" ]]; then
    echo ">>> Attempting auto-resolve on rename files..."

    for conflict_file in ${CONFLICTED}; do
      # Check if this file is in our rename list
      IS_RENAME_FILE=false
      for rename_file in "${RENAME_FILES[@]}"; do
        if [[ "${conflict_file}" == "${rename_file}" ]]; then
          IS_RENAME_FILE=true
          break
        fi
      done

      if [[ "${IS_RENAME_FILE}" == "true" ]]; then
        echo "    Auto-resolving: ${conflict_file}"
        # Accept theirs (upstream), then re-apply our renames
        git checkout --theirs "${conflict_file}"
        git add "${conflict_file}"

        # Re-apply rename patterns
        for pattern in "${RENAME_PATTERNS[@]}"; do
          sed -i "${pattern}" "${conflict_file}" 2>/dev/null || true
        done
        git add "${conflict_file}"
      else
        echo "    [MANUAL] ${conflict_file}"
      fi
    done

    # Check if all conflicts are resolved
    REMAINING=$(git diff --name-only --diff-filter=U 2>/dev/null | grep -c . || echo "0")
    if [[ "${REMAINING}" == "0" ]]; then
      echo ">>> All conflicts auto-resolved!"
      git rebase --continue
    else
      echo ""
      echo ">>> ${REMAINING} conflicts still need manual resolution:"
      git diff --name-only --diff-filter=U
      echo ""
      echo "Fix the conflicts above, then:"
      echo "  git add . && git rebase --continue"
      echo ""
      echo "To abort the rebase:"
      echo "  git rebase --abort && git checkout ${CURRENT_BRANCH}"
      exit 1
    fi
  else
    echo ""
    echo ">>> Conflicts need manual resolution:"
    echo "${CONFLICTED}"
    echo ""
    echo "Fix the conflicts above, then:"
    echo "  git add . && git rebase --continue"
    exit 1
  fi
fi

# Step 4: Verify build
echo ">>> Verifying build..."
npm run build 2>&1 | tail -5
if [[ $? -ne 0 ]]; then
  echo "BUILD FAILED after rebase. Fix issues before merging."
  echo "To abort: git rebase --abort && git checkout ${CURRENT_BRANCH}"
  exit 1
fi

echo ">>> Verifying typecheck..."
npm run typecheck 2>&1 | tail -3

echo ""
echo "=== Sync complete ==="
echo "Branch: ${SYNC_BRANCH}"
echo "To merge into lyra:"
echo "  git checkout lyra && git merge ${SYNC_BRANCH}"
echo ""
echo "To test first:"
echo "  npm run dev  # quick smoke test"
echo ""
echo "To clean up the sync branch after merging:"
echo "  git branch -d ${SYNC_BRANCH}"
