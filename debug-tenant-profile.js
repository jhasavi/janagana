#!/usr/bin/env node

/**
 * Debug script to test tenant profile validation
 */

// Simulate production environment (only the 2 required variables)
process.env.TENANT_SLUG = 'purple-wings';
process.env.TENANT_BRAND_NAME = 'The Purple Wings';
// Clear all other variables to test defaults
delete process.env.TENANT_BRAND_PRIMARY_COLOR;
delete process.env.TENANT_DEFAULT_LOCALE;
delete process.env.TENANT_DEFAULT_TIMEZONE;

async function testTenantProfile() {
  try {
    console.log('=== Debug Tenant Profile Validation ===');
    console.log('Environment variables:');
    console.log('TENANT_SLUG:', process.env.TENANT_SLUG);
    console.log('TENANT_BRAND_NAME:', process.env.TENANT_BRAND_NAME);
    console.log('TENANT_BRAND_PRIMARY_COLOR:', process.env.TENANT_BRAND_PRIMARY_COLOR);
    console.log('TENANT_DEFAULT_LOCALE:', process.env.TENANT_DEFAULT_LOCALE);
    console.log('TENANT_DEFAULT_TIMEZONE:', process.env.TENANT_DEFAULT_TIMEZONE);
    
    // Import and test the simplified tenant profile
    const { getSimplifiedTenantProfileValidationErrors, getSimplifiedTenantProfile } = await import('./lib/tenant-profile-simplified.ts');
    
    console.log('\n=== Validation Results ===');
    const errors = getSimplifiedTenantProfileValidationErrors();
    
    if (errors.length === 0) {
      console.log('✅ Validation passed!');
      
      // Test getting the actual profile
      const profile = getSimplifiedTenantProfile();
      
      console.log('\n=== Generated Profile ===');
      console.log('Slug:', profile.slug);
      console.log('App Name:', profile.branding.appName);
      console.log('Primary Color:', profile.branding.primaryColor);
      console.log('Default Locale:', profile.locale.defaultLocale);
      console.log('Default Timezone:', profile.locale.timezone);
      console.log('Onboarding Primary Color:', profile.onboardingDefaults.primaryColor);
      
    } else {
      console.log('❌ Validation failed:');
      errors.forEach(error => {
        console.log(`  - ${error.key}: ${error.message}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testTenantProfile();
