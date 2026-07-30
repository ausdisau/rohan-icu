#!/usr/bin/env bash
# Poll origin for new pushes (ChatGPT / agents / collaborators) and log them.
# Does not auto-merge arbitrary remote history into the working tree.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STATE_DIR="${GIT_WATCH_STATE_DIR:-/tmp/cursor/git-watch}"
LOG_FILE="${GIT_WATCH_LOG:-/opt/cursor/artifacts/git-watch.log}"
INTERVAL="${GIT_WATCH_INTERVAL_SEC:-60}"
BRANCHES=(
  "origin/main"
  "origin/feature/interactive-code-blue"
  "origin/cursor/action-stations-ui-upgrade-324e"
  "origin/cursor/cloud-agent-1785376676423-otnev"
)

mkdir -p "$STATE_DIR" "$(dirname "$LOG_FILE")"

log() {
  local line="[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
  echo "$line" | tee -a "$LOG_FILE"
}

snapshot_ref() {
  local ref="$1"
  git rev-parse -q --verify "$ref" 2>/dev/null || true
}

log "git-watch started (interval=${INTERVAL}s)"

while true; do
  if ! git fetch --all --prune --quiet; then
    log "WARN fetch failed"
    sleep "$INTERVAL"
    continue
  fi

  for ref in "${BRANCHES[@]}"; do
    sha="$(snapshot_ref "$ref")"
    if [[ -z "$sha" ]]; then
      continue
    fi
    state_file="$STATE_DIR/$(echo "$ref" | tr '/' '_').sha"
    prev=""
    if [[ -f "$state_file" ]]; then
      prev="$(cat "$state_file")"
    fi
    if [[ "$sha" != "$prev" ]]; then
      if [[ -n "$prev" ]]; then
        log "NEW PUSH $ref $prev -> $sha"
        git log --oneline "$prev..$sha" --format='%h %an <%ae> %s' | while read -r line; do
          log "  commit $line"
          if echo "$line" | grep -Eiq 'chatgpt|openai|codex|ausdisau|cursor agent'; then
            log "  flag: possible ChatGPT/agent authorship — review for integration"
          fi
        done
        git diff --stat "$prev..$sha" | tail -20 | while read -r line; do
          log "  diff $line"
        done
      else
        log "TRACKING $ref @ $sha"
      fi
      echo "$sha" >"$state_file"
    fi
  done

  sleep "$INTERVAL"
done
