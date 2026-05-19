const EXPERIMENTAL_DASHBOARD_ROUTE_PREFIXES: string[] = []

export function experimentalFeaturesEnabled() {
  return process.env.NEXT_PUBLIC_SHOW_EXPERIMENTAL_FEATURES === 'true'
}

export function isDashboardFeatureHidden(pathname: string) {
  if (experimentalFeaturesEnabled()) return false

  return EXPERIMENTAL_DASHBOARD_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
