#!/usr/bin/env bash
# DriveIQ → Render one-shot connector
# Usage: ANTHROPIC_API_KEY=sk-ant-xxx bash scripts/render-connect.sh
set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║    DriveIQ  →  Render  Auto-Connect          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Check Anthropic key ───────────────────────────────────────────────────
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "❌  ANTHROPIC_API_KEY is required."
  echo "    Usage: ANTHROPIC_API_KEY=sk-ant-... bash scripts/render-connect.sh"
  exit 1
fi

# ── 2. Refresh Render login ──────────────────────────────────────────────────
echo "⏩  Step 1/3 — Render login (browser will open)…"
render login

# ── 3. Extract fresh API key from CLI config ─────────────────────────────────
RENDER_CLI_YAML="${HOME}/.render/cli.yaml"
if [[ ! -f "$RENDER_CLI_YAML" ]]; then
  echo "❌  Render CLI config not found at $RENDER_CLI_YAML"
  exit 1
fi

RENDER_API_KEY=$(grep 'key:' "$RENDER_CLI_YAML" | head -1 | awk '{print $2}')
if [[ -z "$RENDER_API_KEY" ]]; then
  echo "❌  Could not extract API key from $RENDER_CLI_YAML"
  exit 1
fi

echo "✅  Render token: ${RENDER_API_KEY:0:16}…"
echo ""

# ── 4. Run deploy agent ───────────────────────────────────────────────────────
echo "⏩  Step 2/3 — Running deployment agent…"
export RENDER_API_KEY
node scripts/deploy-agent.mjs

echo ""
echo "⏩  Step 3/3 — Done! Push future changes to GitHub and they auto-deploy."
