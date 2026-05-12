import { z } from 'zod'

/**
 * Simplified Tenant Profile Configuration
 * 
 * This reduces the required environment variables from 10+ to just 2-3 essential ones.
 * All other values have sensible defaults.
 */

type ParsedJsonResult<T> = {
  ok: true
  data: T
} | {
  ok: false
  error: string
}

const FeatureFlagsSchema = z.record(z.boolean())

const IntegrationsSchema = z.object({
  pluginApiEnabled: z.boolean().default(true),
  embedApiEnabled: z.boolean().default(true),
  defaultApiKeyName: z.string().min(1),
  defaultApiKeyPermissions: z.array(z.string().min(1)).min(1),
  webhookBaseUrl: z.string().url().optional(),
})

const OnboardingDefaultsSchema = z.object({
  defaultOrganizationName: z.string().min(2).max(100).optional(),
  timezone: z.string().min(1),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Onboarding primaryColor must be a valid hex color'),
})

const TenantProfileSchema = z.object({
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
  branding: z.object({
    appName: z.string().min(2),
    legalName: z.string().min(2).optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#4F46E5'),
  }),
  baseUrls: z.object({
    app: z.string().url(),
    api: z.string().url(),
  }),
  locale: z.object({
    defaultLocale: z.string().min(2).default('en-US'),
    timezone: z.string().min(1).default('America/New_York'),
  }),
  featureFlags: FeatureFlagsSchema.default({}),
  tagNamespaces: z.object({
    defaultNamespace: z.string().min(2).regex(/^[a-z0-9-]+$/),
    eventDefaultTagPrefix: z.string().min(1).default('event'),
    contactDefaultTagPrefix: z.string().min(1).default('contact'),
  }),
  integrations: IntegrationsSchema,
  onboardingDefaults: z.object({
    defaultOrganizationName: z.string().min(2).max(100).optional(),
    timezone: z.string().min(1).default('America/New_York'),
    primaryColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Onboarding primaryColor must be a valid hex color')
      .default('#4F46E5'),
  }),
})

export type TenantProfile = z.infer<typeof TenantProfileSchema>

// Simplified validation with only required fields
const SimplifiedTenantProfileSchema = z.object({
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
  appName: z.string().min(2),
})

export type SimplifiedTenantProfile = z.infer<typeof SimplifiedTenantProfileSchema>

function parseJson<T>(key: string, value: string | undefined, defaultValue: T): ParsedJsonResult<T> {
  if (!value) {
    return { ok: true, data: defaultValue }
  }

  try {
    const parsed = JSON.parse(value)
    return { ok: true, data: parsed }
  } catch (error) {
    return { ok: false, error: `Invalid JSON in ${key}: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

function normalizePermissions(value: string | undefined): string[] {
  if (!value) return ['events:read', 'events:write']
  
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : ['events:read', 'events:write']
  } catch {
    return ['events:read', 'events:write']
  }
}

function buildSimplifiedProfile() {
  const slug = process.env.TENANT_SLUG
  const appName = process.env.TENANT_BRAND_NAME

  // Validate only required fields
  const requiredValidation = SimplifiedTenantProfileSchema.safeParse({
    slug,
    appName,
  })

  if (!requiredValidation.success) {
    const errors = requiredValidation.error.issues.map(issue => ({
      key: issue.path.join('.') || 'root',
      message: issue.message,
    }))

    return {
      profile: null,
      errors,
    }
  }

  // Build URLs with fallbacks
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://janagana.namasteneedham.com`
  const apiBaseUrl = process.env.API_URL || `${appBaseUrl}/api`

  // Parse optional JSON configs
  const featureFlagsJson = parseJson(
    'TENANT_FEATURE_FLAGS_JSON',
    process.env.TENANT_FEATURE_FLAGS_JSON,
    {}
  )

  const integrationsJson = parseJson(
    'TENANT_INTEGRATIONS_JSON',
    process.env.TENANT_INTEGRATIONS_JSON,
    {}
  )

  const onboardingJson = parseJson<Partial<z.infer<typeof OnboardingDefaultsSchema>>>(
    'TENANT_ONBOARDING_DEFAULTS_JSON',
    process.env.TENANT_ONBOARDING_DEFAULTS_JSON,
    {}
  )

  const jsonErrors = [featureFlagsJson, integrationsJson, onboardingJson]
    .filter((result): result is { ok: false; error: string } => !result.ok)
    .map((result) => ({ key: 'JSON', message: result.error }))

  // Build complete profile with defaults
  const base = {
    slug: slug!,
    branding: {
      appName: appName!,
      legalName: process.env.TENANT_BRAND_LEGAL_NAME || appName!,
      primaryColor: process.env.TENANT_BRAND_PRIMARY_COLOR || '#4F46E5',
    },
    baseUrls: {
      app: appBaseUrl,
      api: apiBaseUrl,
    },
    locale: {
      defaultLocale: process.env.TENANT_DEFAULT_LOCALE || 'en-US',
      timezone: process.env.TENANT_DEFAULT_TIMEZONE || 'America/New_York',
    },
    featureFlags: featureFlagsJson.ok ? featureFlagsJson.data : {},
    tagNamespaces: {
      defaultNamespace: process.env.TENANT_TAG_NAMESPACE_DEFAULT || slug!,
      eventDefaultTagPrefix: process.env.TENANT_TAG_NAMESPACE_EVENT_PREFIX || 'event',
      contactDefaultTagPrefix: process.env.TENANT_TAG_NAMESPACE_CONTACT_PREFIX || 'contact',
    },
    integrations: {
      pluginApiEnabled: process.env.TENANT_PLUGIN_API_ENABLED !== 'false',
      embedApiEnabled: process.env.TENANT_EMBED_API_ENABLED !== 'false',
      defaultApiKeyName: process.env.ONBOARDING_DEFAULT_API_KEY_NAME || 'Default Plugin Key',
      defaultApiKeyPermissions: normalizePermissions(process.env.ONBOARDING_DEFAULT_API_KEY_PERMISSIONS),
      webhookBaseUrl: process.env.TENANT_WEBHOOK_BASE_URL,
      ...(integrationsJson.ok ? integrationsJson.data : {}),
    },
    onboardingDefaults: {
      defaultOrganizationName: process.env.TENANT_ONBOARDING_DEFAULT_ORG_NAME || appName!,
      timezone: process.env.TENANT_ONBOARDING_DEFAULT_TIMEZONE || process.env.TENANT_DEFAULT_TIMEZONE || 'America/New_York',
      primaryColor: process.env.TENANT_ONBOARDING_DEFAULT_PRIMARY_COLOR || process.env.TENANT_BRAND_PRIMARY_COLOR || '#4F46E5',
      ...(onboardingJson.ok ? onboardingJson.data : {}),
    },
  }

  const validation = TenantProfileSchema.safeParse(base)

  if (!validation.success) {
    const schemaErrors: ValidationError[] = validation.error.issues.map((issue) => ({
      key: issue.path.join('.') || 'root',
      message: issue.message,
    }))

    return {
      profile: null,
      errors: [...jsonErrors, ...schemaErrors],
    }
  }

  return {
    profile: validation.data,
    errors: jsonErrors,
  }
}

// Cache for performance
let cachedProfile: TenantProfile | null = null
let cachedValidationErrors: ValidationError[] | null = null

export type ValidationError = {
  key: string
  message: string
}

export function getSimplifiedTenantProfileValidationErrors(): ValidationError[] {
  if (cachedValidationErrors) return cachedValidationErrors

  const { profile, errors } = buildSimplifiedProfile()
  cachedProfile = profile
  cachedValidationErrors = errors
  return errors
}

export function getSimplifiedTenantProfile(): TenantProfile {
  if (cachedProfile) return cachedProfile

  const errors = getSimplifiedTenantProfileValidationErrors()
  if (errors.length > 0 || !cachedProfile) {
    const details = errors
      .map((error) => `- ${error.key}: ${error.message}`)
      .join('\n')

    throw new Error(
      `Invalid tenant profile configuration. Set tenant-specific env vars before startup.\n${details}`
    )
  }

  return cachedProfile
}

// Export for backward compatibility
export { getTenantProfileValidationErrors, getTenantProfile } from './tenant-profile'
