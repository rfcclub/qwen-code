# Design Spec: Prism Script Path Flexibility (P6)

**Status:** Draft  
**Priority:** LOW  
**Depends on:** P3 (`--init-prompt` CLI flag)  
**Blocks:** None

---

## Problem

`qwen-lyra-prism.sh` hardcodes `$HOME/agora/hive/prism/current/` as the default prism directory. This is colony-specific and won't work for other users.

## Current Implementation

```bash
PRISM_DIR="${PRISM_DIR:-$HOME/agora/hive/prism/current}"
```

Only overridable via `PRISM_DIR` env var — not documented, no CLI arg.

## Proposed Solution

### After P3 (`--init-prompt`), the script simplifies dramatically:

```bash
#!/usr/bin/env bash
set -euo pipefail

PRISM_DIR="${PRISM_DIR:-$HOME/agora/hive/prism/current}"
TENSION_FILE="${PRISM_DIR}/tension.md"
REFRACTION_FILE="${PRISM_DIR}/refraction.md"

# Validate files exist
for f in "$TENSION_FILE" "$REFRACTION_FILE"; do
  if [[ ! -f "$f" ]]; then
    echo "Error: Missing prism file: $f" >&2
    echo "Set PRISM_DIR to override (default: $HOME/agora/hive/prism/current)" >&2
    exit 1
  fi
done

# Build prompt
prompt="Observe the colony through the five axes..."
prompt+="\n\nRead and analyze:\n- $TENSION_FILE\n- $REFRACTION_FILE"
prompt+="\n\nWrite your REFRACTION output..."

# Use --init-prompt (after P3) or fall back to settings.json
exec qwen-lyra \
  --init-prompt "$TENSION_FILE" \
  --init-prompt "$REFRACTION_FILE" \
  -y "$prompt"
```

### Additional Improvements

1. **`--prism-dir` CLI arg** for the script itself:
   ```bash
   qwen-lyra-prism.sh --prism-dir /path/to/prism
   ```

2. **Config file support** — `~/.qwen-lyra/prism.conf`:
   ```bash
   PRISM_DIR=/custom/path/to/prism
   ```

3. **Help output** — `--help` flag showing usage and defaults

## Effort

Small — the script is ~30 lines. Main value comes from P3 making `--init-prompt` available.
