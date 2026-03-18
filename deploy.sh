#!/bin/bash
# DriveIQ — Railway deployment script
# Run this once from ~/DriveIQ/driveiq-dashboard
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   DriveIQ → Railway Deploy           ║"
echo "╚══════════════════════════════════════╝"
echo ""

# 1. Ensure logged in
if ! railway whoami &>/dev/null; then
  echo "→ Logging into Railway..."
  railway login
fi

echo "✓ Logged in as: $(railway whoami)"

# 2. Init project if not already linked
if [ ! -f .railway ]; then
  echo ""
  echo "→ Creating Railway project..."
  railway init --name driveiq-dashboard
fi

# 3. Add PostgreSQL
echo ""
echo "→ Adding PostgreSQL database..."
railway add --plugin postgresql || echo "  (database may already exist)"

# 4. Set environment variables
echo ""
echo "→ Setting environment variables..."

JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

railway variables set \
  JWT_SECRET="$JWT_SECRET" \
  JWT_EXPIRATION="8h" \
  WEBHOOK_SECRET="$WEBHOOK_SECRET" \
  VISION_SERVICE_URL="http://localhost:8010" \
  VISION_API_KEY="devkey" \
  NEXT_PUBLIC_VISION_URL="http://localhost:8010" \
  NEXT_PUBLIC_VISION_API_KEY="devkey" \
  CLAUDE_MODEL="claude-haiku-4-5-20251001" \
  SUGGESTIONS_MAX_TOKENS="512" \
  SUGGESTIONS_ENABLED="true" \
  TAX_RATE="0.0875" \
  POINTS_PER_DOLLAR="10" \
  TIER_SILVER_THRESHOLD="500" \
  TIER_GOLD_THRESHOLD="1500" \
  TIER_PLATINUM_THRESHOLD="5000" \
  USUAL_ORDER_THRESHOLD="0.70" \
  NODE_ENV="production"

echo ""
echo "⚠  Add your Anthropic API key manually:"
echo "   railway variables set ANTHROPIC_API_KEY=sk-ant-xxxx"
echo ""

# 5. Deploy
echo "→ Deploying to Railway..."
railway up --detach

echo ""
echo "→ Getting your public URL..."
railway domain || echo "  (run: railway domain  to generate a URL)"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Deployment complete!               ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. railway logs          — watch deploy logs"
echo "  2. railway open          — open dashboard in browser"
echo "  3. Update NEXT_PUBLIC_BASE_URL after you get your domain:"
echo "     railway variables set NEXT_PUBLIC_BASE_URL=https://your-app.up.railway.app"
echo ""
