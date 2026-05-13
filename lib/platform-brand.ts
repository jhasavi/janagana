const DEFAULT_PLATFORM_BRAND = 'JanaGana'

export function getPlatformBrandName(): string {
  const configured = process.env.PLATFORM_BRAND_NAME?.trim()
  return configured && configured.length > 0 ? configured : DEFAULT_PLATFORM_BRAND
}
