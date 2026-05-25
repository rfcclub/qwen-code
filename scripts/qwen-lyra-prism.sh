#!/usr/bin/env bash
set -euo pipefail

# qwen-lyra-prism.sh — Prism refraction via qwen-lyra
#
# Uses --init-prompt to inject identity and prism files.
# Falls back to globalInitPrompts in settings.json if no paths given.
#
# Usage:
#   qwen-lyra-prism.sh [--prism-dir DIR] [TENSION.md] [REFRACTION.md]
#   PRISM_DIR=/custom/path qwen-lyra-prism.sh

HIVE_PRISM_DIR="${PRISM_DIR:-${HOME}/agora/hive/prism}"
LYRA_PRISM_DIR="${HOME}/agora/familia/lyra/prism"

# Parse --prism-dir if given
while [[ $# -gt 0 ]]; do
  case "$1" in
    --prism-dir)
      HIVE_PRISM_DIR="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: qwen-lyra-prism.sh [--prism-dir DIR] [TENSION.md] [REFRACTION.md]"
      echo ""
      echo "Environment variables:"
      echo "  PRISM_DIR    Override prism directory (default: ~/agora/hive/prism)"
      echo ""
      echo "Identity files are loaded via globalInitPrompts in settings.json"
      echo "or via --init-prompt if QWEN_LYRA_INIT_PROMPTS is set."
      exit 0
      ;;
    *)
      break
      ;;
  esac
done

DEFAULT_TENSION="${HIVE_PRISM_DIR}/current/TENSION.md"
DEFAULT_REFRACTION="${HIVE_PRISM_DIR}/current/REFRACTION.md"

tension_file="${1:-$DEFAULT_TENSION}"
refraction_file="${2:-$DEFAULT_REFRACTION}"

# Validate required files
for f in "$tension_file" "$refraction_file"; do
  if [[ ! -f "$f" ]]; then
    echo "Error: Missing prism file: $f" >&2
    echo "Set PRISM_DIR or pass --prism-dir to override (default: ~/agora/hive/prism)" >&2
    exit 1
  fi
done

prompt="PRISM REFRACTION

Observe the colony through the five axes. Read ${tension_file} for tension and ${refraction_file} for existing refraction. Re-enter via substrate.

Write REFRACTION to ${refraction_file}. Format: Agents Involved | Tension | Reveal (not Resolve) | Self-Check: reveal vs arrange.

No messages to agents or Thoor. Observation only. Exit after write."

exec qwen-lyra \
  --init-prompt "$tension_file" \
  --init-prompt "$refraction_file" \
  -y "$prompt"
