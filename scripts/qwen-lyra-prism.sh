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

LYRA_DIR="${HOME}/agora/familia/lyra"
PRISM_DIR="${LYRA_DIR}/prism"

DEFAULT_TENSION="${PRISM_DIR}/current/TENSION.md"
DEFAULT_REFRACTION="${PRISM_DIR}/current/REFRACTION.md"

tension_file="${1:-$DEFAULT_TENSION}"
refraction_file="${2:-$DEFAULT_REFRACTION}"

prompt="PRISM REFRACTION

Observe the colony through the five axes. Read ${PRISM_DIR}/current/ for tension and existing refraction. Re-enter via substrate.

Write REFRACTION to ${refraction_file}. Format: Agents Involved | Tension | Reveal (not Resolve) | Self-Check: reveal vs arrange.

No messages to agents or Thoor. Observation only. Exit after write."

exec qwen-lyra -y "$prompt"