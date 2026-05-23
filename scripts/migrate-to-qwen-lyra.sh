#!/usr/bin/env bash
set -euo pipefail

# migrate-to-qwen-lyra.sh — Migrate ~/.qwen state to ~/.qwen-lyra
#
# Usage:
#   ./migrate-to-qwen-lyra.sh [--dry-run]
#
# Copies settings, memory, agents, skills, and other global state from the
# legacy ~/.qwen directory to ~/.qwen-lyra. If ~/.qwen-lyra already exists,
# prompts before overwriting any file.

LEGACY_DIR="${HOME}/.qwen"
TARGET_DIR="${HOME}/.qwen-lyra"
DRY_RUN="${1:-}"

log_info()  { echo "[INFO]  $*"; }
log_warn()  { echo "[WARN]  $*" >&2; }
log_error() { echo "[ERROR] $*" >&2; }

if [[ ! -d "$LEGACY_DIR" ]]; then
    log_error "Legacy directory $LEGACY_DIR does not exist. Nothing to migrate."
    exit 1
fi

if [[ "$DRY_RUN" == "--dry-run" ]]; then
    log_info "DRY RUN — no files will be copied."
fi

mkdir -p "$TARGET_DIR"

copy_file() {
    local src="$1"
    local dst="$2"
    if [[ -f "$dst" ]]; then
        log_warn "Skipping $dst (already exists)"
        return
    fi
    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        log_info "Would copy: $src -> $dst"
    else
        cp -v "$src" "$dst"
    fi
}

copy_dir() {
    local src="$1"
    local dst="$2"
    if [[ ! -d "$src" ]]; then
        return
    fi
    if [[ -d "$dst" ]]; then
        log_warn "Skipping directory $dst (already exists)"
        return
    fi
    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        log_info "Would copy dir: $src -> $dst"
    else
        cp -rv "$src" "$dst"
    fi
}

# Core files
for file in settings.json memory.json source.json .env; do
    [[ -f "$LEGACY_DIR/$file" ]] && copy_file "$LEGACY_DIR/$file" "$TARGET_DIR/$file"
done

# Subdirectories
for dir in agents commands e2e-tests skills extensions mcp-oauth-tokens.json plans ide startup-perf; do
    [[ -e "$LEGACY_DIR/$dir" ]] && copy_dir "$LEGACY_DIR/$dir" "$TARGET_DIR/$dir"
done

log_info "Migration complete."

# Remind user to add globalInitPrompts if settings.json was copied
if [[ -f "$TARGET_DIR/settings.json" ]] && ! grep -q 'globalInitPrompts' "$TARGET_DIR/settings.json" 2>/dev/null; then
    log_warn "Remember to add globalInitPrompts to $TARGET_DIR/settings.json"
    cat <<'EOF'
Example:
{
  "context": {
    "globalInitPrompts": [
      "~/agora/familia/lyra/prism/axes.md",
      "~/agora/familia/lyra/prism/broken_stone.md"
    ]
  }
}
EOF
fi