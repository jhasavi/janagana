#!/bin/bash
# Vercel Environment Setup for Test Organization
# Run this script to add tenant environment variables to Vercel

echo "Setting up Vercel environment variables for Test Organization..."

# Core tenant identity
vercel env add TENANT_SLUG production << EOF
test-tenant
EOF

vercel env add TENANT_BRAND_NAME production << EOF
Test Organization
EOF

vercel env add TENANT_BRAND_PRIMARY_COLOR production << EOF
#4F46E5
EOF

# Locale settings
vercel env add TENANT_DEFAULT_LOCALE production << EOF
en-US
EOF

vercel env add TENANT_DEFAULT_TIMEZONE production << EOF
America/New_York
EOF

# Onboarding defaults
vercel env add TENANT_ONBOARDING_DEFAULT_ORG_NAME production << EOF
Test Organization
EOF

vercel env add TENANT_ONBOARDING_DEFAULT_PRIMARY_COLOR production << EOF
#4F46E5
EOF

vercel env add TENANT_ONBOARDING_DEFAULT_TIMEZONE production << EOF
America/New_York
EOF

# API configuration
vercel env add ONBOARDING_DEFAULT_API_KEY_NAME production << EOF
Default Plugin Key
EOF

vercel env add ONBOARDING_DEFAULT_API_KEY_PERMISSIONS production << EOF
["events:read", "events:write", "contacts:read", "contacts:write"]
EOF

echo "✅ Environment variables added to Vercel!"
echo "🚀 Deploy with: vercel --prod"
