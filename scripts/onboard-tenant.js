#!/usr/bin/env node

/**
 * Automated Tenant Onboarding Script
 * 
 * Usage: node scripts/onboard-tenant.js <tenant-slug> <tenant-name> [domain]
 * Example: node scripts/onboard-tenant.js "purple-wings" "The Purple Wings" "thepurplewings.org"
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Default configuration values
const DEFAULTS = {
  primaryColor: '#4F46E5',
  locale: 'en-US',
  timezone: 'America/New_York',
  domain: 'janagana.namasteneedham.com'
};

function generateEnvConfig(tenantSlug, tenantName, domain = DEFAULTS.domain) {
  const appName = tenantName || 'JanaGana';
  const slug = tenantSlug || 'default';
  
  return `# Tenant Configuration for ${appName}
# Generated automatically by onboarding script
# Date: ${new Date().toISOString()}

# Core tenant identity
TENANT_SLUG="${slug}"
TENANT_BRAND_NAME="${appName}"
TENANT_BRAND_PRIMARY_COLOR="${DEFAULTS.primaryColor}"

# Locale settings (with defaults)
TENANT_DEFAULT_LOCALE="${DEFAULTS.locale}"
TENANT_DEFAULT_TIMEZONE="${DEFAULTS.timezone}"

# Onboarding defaults (with fallbacks)
TENANT_ONBOARDING_DEFAULT_ORG_NAME="${appName}"
TENANT_ONBOARDING_DEFAULT_PRIMARY_COLOR="${DEFAULTS.primaryColor}"
TENANT_ONBOARDING_DEFAULT_TIMEZONE="${DEFAULTS.timezone}"

# API configuration (with defaults)
ONBOARDING_DEFAULT_API_KEY_NAME="Default Plugin Key"
ONBOARDING_DEFAULT_API_KEY_PERMISSIONS='["events:read", "events:write", "contacts:read", "contacts:write"]'

# Optional: Override domain if custom
# NEXT_PUBLIC_APP_URL="https://${domain}"
# NEXT_PUBLIC_APP_DOMAIN="${domain}"
`;
}

function generateVercelCommands(tenantSlug, tenantName, domain = DEFAULTS.domain) {
  const appName = tenantName || 'JanaGana';
  const slug = tenantSlug || 'default';
  
  return `#!/bin/bash
# Vercel Environment Setup for ${appName}
# Run this script to add tenant environment variables to Vercel

echo "Setting up Vercel environment variables for ${appName}..."

# Core tenant identity
vercel env add TENANT_SLUG production << EOF
${slug}
EOF

vercel env add TENANT_BRAND_NAME production << EOF
${appName}
EOF

vercel env add TENANT_BRAND_PRIMARY_COLOR production << EOF
${DEFAULTS.primaryColor}
EOF

# Locale settings
vercel env add TENANT_DEFAULT_LOCALE production << EOF
${DEFAULTS.locale}
EOF

vercel env add TENANT_DEFAULT_TIMEZONE production << EOF
${DEFAULTS.timezone}
EOF

# Onboarding defaults
vercel env add TENANT_ONBOARDING_DEFAULT_ORG_NAME production << EOF
${appName}
EOF

vercel env add TENANT_ONBOARDING_DEFAULT_PRIMARY_COLOR production << EOF
${DEFAULTS.primaryColor}
EOF

vercel env add TENANT_ONBOARDING_DEFAULT_TIMEZONE production << EOF
${DEFAULTS.timezone}
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
`;
}

async function createTenantInDatabase(tenantSlug, tenantName) {
  try {
    console.log(`Creating tenant "${tenantName}" (${tenantSlug}) in database...`);
    
    // Check if tenant already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: { slug: tenantSlug }
    });
    
    if (existingTenant) {
      console.log(`⚠️  Tenant "${tenantSlug}" already exists in database`);
      return existingTenant;
    }
    
    // Create new tenant
    const tenant = await prisma.tenant.create({
      data: {
        slug: tenantSlug,
        name: tenantName,
        clerkOrgId: `org_${tenantSlug}_${Date.now()}`, // Generate a temporary org ID
      }
    });
    
    console.log(`✅ Tenant created with ID: ${tenant.id}`);
    return tenant;
    
  } catch (error) {
    console.error('❌ Error creating tenant in database:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
🚀 JanaGana Tenant Onboarding Script

Usage: node scripts/onboard-tenant.js <tenant-slug> <tenant-name> [domain]

Arguments:
  tenant-slug    URL-friendly tenant identifier (e.g., "purple-wings")
  tenant-name    Display name for the tenant (e.g., "The Purple Wings")
  domain         Custom domain (optional, defaults to janagana.namasteneedham.com)

Examples:
  node scripts/onboard-tenant.js "purple-wings" "The Purple Wings"
  node scripts/onboard-tenant.js "acme-corp" "Acme Corporation" "acme.janagana.org"

This script will:
1. Create tenant in database
2. Generate .env configuration
3. Generate Vercel setup commands
4. Provide deployment instructions
`);
    process.exit(1);
  }
  
  const [tenantSlug, tenantName, domain] = args;
  
  try {
    console.log(`🎯 Onboarding tenant: ${tenantName} (${tenantSlug})`);
    console.log('=' .repeat(50));
    
    // 1. Create tenant in database
    const tenant = await createTenantInDatabase(tenantSlug, tenantName);
    
    // 2. Generate .env configuration
    const envConfig = generateEnvConfig(tenantSlug, tenantName, domain);
    const envFile = `.env.tenant-${tenantSlug}`;
    fs.writeFileSync(envFile, envConfig);
    console.log(`✅ Environment config generated: ${envFile}`);
    
    // 3. Generate Vercel setup commands
    const vercelCommands = generateVercelCommands(tenantSlug, tenantName, domain);
    const vercelFile = `scripts/vercel-setup-${tenantSlug}.sh`;
    fs.writeFileSync(vercelFile, vercelCommands);
    fs.chmodSync(vercelFile, '755');
    console.log(`✅ Vercel setup script generated: ${vercelFile}`);
    
    // 4. Provide next steps
    console.log('\n🎉 Tenant onboarding completed!');
    console.log('=' .repeat(50));
    console.log('\n📋 Next Steps:');
    console.log(`1. Copy environment variables from ${envFile} to your deployment`);
    console.log(`2. Run Vercel setup: bash ${vercelFile}`);
    console.log(`3. Deploy: vercel --prod`);
    console.log(`4. Test: https://${domain || DEFAULTS.domain}`);
    
    console.log('\n🔧 Manual Setup (if needed):');
    console.log(`- Add the environment variables from ${envFile} to your hosting platform`);
    console.log(`- Ensure database is accessible`);
    console.log(`- Test tenant access at /dashboard`);
    
  } catch (error) {
    console.error('❌ Onboarding failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateEnvConfig,
  generateVercelCommands,
  createTenantInDatabase
};
