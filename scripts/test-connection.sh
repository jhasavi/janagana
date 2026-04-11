#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# JANAGANA CONNECTION TEST SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════
# This script tests the connections between Vercel frontend and Render API
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Testing Janagana connections..."
echo ""

# ─── Test 1: Vercel Frontend ───────────────────────────────────────────────────────
echo "1. Testing Vercel frontend (https://janagana.namasteneedham.com)..."
VERCEL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://janagana.namasteneedham.com)
if [ "$VERCEL_STATUS" -eq 200 ]; then
  echo -e "${GREEN}✅ Vercel frontend is online (HTTP $VERCEL_STATUS)${NC}"
else
  echo -e "${RED}❌ Vercel frontend returned HTTP $VERCEL_STATUS${NC}"
fi
echo ""

# ─── Test 2: Render API Health ──────────────────────────────────────────────────────
echo "2. Testing Render API health (https://janagana-api.onrender.com/api/v1/health)..."
API_HEALTH=$(curl -s https://janagana-api.onrender.com/api/v1/health)
if [ -n "$API_HEALTH" ]; then
  echo -e "${GREEN}✅ Render API is responding${NC}"
  echo "   Response: $API_HEALTH"
else
  echo -e "${YELLOW}⚠️  Render API might be cold-starting (no response)${NC}"
  echo "   This is normal for Render free tier after inactivity"
fi
echo ""

# ─── Test 3: API CORS ───────────────────────────────────────────────────────────────
echo "3. Testing API CORS with Vercel origin..."
CORS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Origin: https://janagana.namasteneedham.com" \
  https://janagana-api.onrender.com/api/v1/health)
if [ "$CORS_STATUS" -eq 200 ]; then
  echo -e "${GREEN}✅ CORS is configured correctly (HTTP $CORS_STATUS)${NC}"
else
  echo -e "${RED}❌ CORS returned HTTP $CORS_STATUS${NC}"
  echo "   Check CORS_ORIGINS environment variable in Render"
fi
echo ""

# ─── Test 4: Database Connection (via API) ─────────────────────────────────────────
echo "4. Testing Neon database connection (via API health endpoint)..."
DB_HEALTH=$(curl -s https://janagana-api.onrender.com/api/v1/health)
if echo "$DB_HEALTH" | grep -q "database"; then
  echo -e "${GREEN}✅ Database connection is healthy${NC}"
  echo "   Database status: $(echo $DB_HEALTH | grep -o '"database":"[^"]*"')"
else
  echo -e "${YELLOW}⚠️  Could not verify database connection${NC}"
  echo "   This might be due to cold start or missing health check data"
fi
echo ""

# ─── Test 5: API Response Time ─────────────────────────────────────────────────────
echo "5. Testing API response time..."
START_TIME=$(date +%s)
curl -s https://janagana-api.onrender.com/api/v1/health > /dev/null
END_TIME=$(date +%s)
RESPONSE_TIME=$((END_TIME - START_TIME))

if [ "$RESPONSE_TIME" -lt 5 ]; then
  echo -e "${GREEN}✅ API responded in ${RESPONSE_TIME}s (warm)${NC}"
elif [ "$RESPONSE_TIME" -lt 30 ]; then
  echo -e "${YELLOW}⚠️  API responded in ${RESPONSE_TIME}s (cold start)${NC}"
else
  echo -e "${RED}❌ API took ${RESPONSE_TIME}s (possible issue)${NC}"
fi
echo ""

# ─── Summary ───────────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════════"
echo "Connection test complete."
echo ""
echo "If all tests pass, your Vercel frontend and Render API are connected."
echo ""
echo "If API tests fail:"
echo "  - Check Render dashboard for deployment status"
echo "  - Verify environment variables are set correctly"
echo "  - The API might be cold-starting (try again in 30 seconds)"
echo ""
echo "Documentation:"
echo "  - Vercel Environment Variables: docs/VERCEL-ENV-VARS.md"
echo "  - Render Environment Variables: docs/RENDER-ENV-VARS.md"
echo "  - Stripe Webhooks: docs/STRIPE-WEBHOOKS.md"
echo "═══════════════════════════════════════════════════════════════════"
