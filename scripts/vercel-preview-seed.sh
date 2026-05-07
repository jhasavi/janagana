#!/bin/bash

# Vercel Preview Environment Setup
# This script is designed to run in Vercel preview deployments to seed demo data
# Add to vercel.json or Vercel dashboard post-deployment hook

set -e

echo "🌱 Seeding preview environment with demo data..."

# Only run in preview environments
if [ "$VERCEL_ENV" != "preview" ]; then
  echo "ℹ️  Not a preview environment (VERCEL_ENV=$VERCEL_ENV). Skipping seed."
  exit 0
fi

# Check if already seeded (using a marker file)
SEED_MARKER="/tmp/.preview-seeded"
if [ -f "$SEED_MARKER" ]; then
  echo "✅ Preview already seeded in this deployment."
  exit 0
fi

# Run the actual seed command
echo "Running database seed..."
npm run db:seed

# Mark as seeded
touch "$SEED_MARKER"

echo "✅ Preview environment seeded successfully!"
echo ""
echo "📋 Preview tenant credentials:"
echo "  URL: https://$VERCEL_URL"
echo "  Sign-up at /sign-up to create your org"
echo "  Or use demo tenant: slug=janagana-demo"
