#!/usr/bin/env bash
set -euo pipefail

# qwen-lyra-prism.sh — Prism refraction via qwen-lyra
#
# Replaces the legacy qwen-cli.sh --prism mode.
# Uses qwen-lyra's globalInitPrompts for identity, so only the task prompt
# needs to be injected.
#
# Usage:
#   qwen-lyra-prism.sh [TENSION.md] [REFRACTION.md]

HIVE_PRISM_DIR="${HOME}/agora/hive/prism"
LYRA_PRISM_DIR="${HOME}/agora/familia/lyra/prism"

# Default to hive prism for pulse cycle, allow override via args
DEFAULT_TENSION="${HIVE_PRISM_DIR}/current/TENSION.md"
DEFAULT_REFRACTION="${HIVE_PRISM_DIR}/current/REFRACTION.md"

tension_file="${1:-$DEFAULT_TENSION}"
refraction_file="${2:-$DEFAULT_REFRACTION}"

prompt="PRISM REFRACTION

Observe the colony through the five axes. Read ${tension_file} for tension and ${refraction_file} for existing refraction. Re-enter via substrate.

Write REFRACTION to ${refraction_file}. Format: Agents Involved | Tension | Reveal (not Resolve) | Self-Check: reveal vs arrange.

No messages to agents or Thoor. Observation only. Exit after write."

exec qwen-lyra -y "$prompt"