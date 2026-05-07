import { z } from 'zod'

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
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  baseUrls: z.object({
    app: z.string().url(),
    api: z.string().url(),
  }),
  locale: z.object({
    defaultLocale: z.string().min(2),
    timezone: z.string().min(1),
  }),
  featureFlags: FeatureFlagsSchema,
  tagNamespaces: z.object({
    defaultNamespace: z.string().min(2).regex(/^[a-z0-9-]+$/),
    eventDefaultTagPrefix: z.string().min(1),
    contactDefaultTagPrefix: z.string().min(1),
  }),
  integrations: IntegrationsSchema,
  onboardingDefaults: OnboardingDefaultsSchema,
})

export type TenantProfile = z.infer<typeof TenantProfileSchema>

type ValidationError = {
  key: string
  message: string
}

let cachedProfile: TenantProfile | null = null
let cachedValidationErrors: ValidationError[] | null = null

function parseJson<T>(key: string, raw: string | undefined, fallback: T): ParsedJsonResult<T> {
  if (!raw || raw.trim() === '') {
    return { ok: true, data: fallback }
  }

  try {
    return { ok: true, data: JSON.parse(raw) as T }
  } catch (error) {
    return {
      ok: false,
      error: `${key} contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function normalizePermissions(rawPermissions: string | undefined): string[] {
  const fromCsv = (rawPermissions ?? 'contacts:write,events:read')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return fromCsv.length > 0 ? fromCsv : ['contacts:write', 'events:read']
}

function buildRawProfile() {
  const appBaseUrl = process.env.TENANT_APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL
  const apiBaseUrl = process.env.TENANT_API_BASE_URL ?? (appBaseUrl ? `${appBaseUrl.replace(/\/$/, '')}/api` : undefined)

  const featureFlagsJson = parseJson<Record<string, boolean>>(
    'TENANT_FEATURE_FLAGS_JSON',
    process.env.TENANT_FEATURE_FLAGS_JSON,
    {}
  )

  const integrationsJson = parseJson<Partial<z.infer<typeof IntegrationsSchema>>>(
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

  const base = {
    slug: process.env.TENANT_SLUG,
    branding: {
      appName: process.env.TENANT_BRAND_NAME,
      legalName: process.env.TENANT_BRAND_LEGAL_NAME,
      primaryColor: process.env.TENANT_BRAND_PRIMARY_COLOR ?? process.env.TENANT_ONBOARDING_DEFAULT_PRIMARY_COLOR ?? '#4F46E5',
    },
    baseUrls: {
      app: appBaseUrl,
      api: apiBaseUrl,
    },
    locale: {
      defaultLocale: process.env.TENANT_DEFAULT_LOCALE ?? 'en-US',
      timezone: process.env.TENANT_DEFAULT_TIMEZONE ?? 'America/New_York',
    },
    featureFlags: featureFlagsJson.ok ? featureFlagsJson.data : {},
    tagNamespaces: {
      defaultNamespace: process.env.TENANT_TAG_NAMESPACE_DEFAULT ?? process.env.TENANT_SLUG,
      eventDefaultTagPrefix: process.env.TENANT_TAG_NAMESPACE_EVENT_PREFIX ?? 'event',
      contactDefaultTagPrefix: process.env.TENANT_TAG_NAMESPACE_CONTACT_PREFIX ?? 'contact',
    },
    integrations: {
      pluginApiEnabled: process.env.TENANT_PLUGIN_API_ENABLED !== 'false',
      embedApiEnabled: process.env.TENANT_EMBED_API_ENABLED !== 'false',
      defaultApiKeyName: process.env.ONBOARDING_DEFAULT_API_KEY_NAME ?? 'Default Plugin Key',
      defaultApiKeyPermissions: normalizePermissions(process.env.ONBOARDING_DEFAULT_API_KEY_PERMISSIONS),
      webhookBaseUrl: process.env.TENANT_WEBHOOK_BASE_URL,
      ...(integrationsJson.ok ? integrationsJson.data : {}),
    },
    onboardingDefaults: {
      defaultOrganizationName: process.env.TENANT_ONBOARDING_DEFAULT_ORG_NAME,
      timezone: process.env.TENANT_ONBOARDING_DEFAULT_TIMEZONE ?? process.env.TENANT_DEFAULT_TIMEZONE ?? 'America/New_York',
      primaryColor: process.env.TENANT_ONBOARDING_DEFAULT_PRIMARY_COLOR ?? process.env.TENANT_BRAND_PRIMARY_COLOR ?? '#4F46E5',
      ...(onboardingJson.ok ? onboardingJson.data : {}),
    },
  }

  return { base, jsonErrors }
}

function parseTenantProfile(): { profile: TenantProfile | null; errors: ValidationError[] } {
  const { base, jsonErrors } = buildRawProfile()
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

export function getTenantProfileValidationErrors(): ValidationError[] {
  if (cachedValidationErrors) return cachedValidationErrors

  const { profile, errors } = parseTenantProfile()
  cachedProfile = profile
  cachedValidationErrors = errors
  return errors
}

export function getTenantProfile(): TenantProfile {
  if (cachedProfile) return cachedProfile

  const errors = getTenantProfileValidationErrors()
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

export function assertTenantProfileConfigured(): void {
  getTenantProfile()
}
