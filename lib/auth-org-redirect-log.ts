type RedirectReasonCode =
  | 'NO_AUTH_REDIRECT_SIGNIN'
  | 'ZERO_ORGS_REDIRECT_ONBOARDING'
  | 'ONE_ORG_AUTO_SELECT_DASHBOARD'
  | 'MULTI_ORG_REDIRECT_SELECT_ORG'
  | 'MULTI_ORG_SELECT_REQUEST'
  | 'ACTIVE_ORG_SET'
  | 'ACTIVE_TENANT_SET'
  | 'ACTIVE_ORG_SWITCHED'
  | 'STALE_ACTIVE_ORG_REJECTED'
  | 'EVENT_TENANT_MISMATCH_BLOCKED'
  | 'STALE_COOKIE_IGNORED'
  | 'LOGOUT_CLEAR_COOKIES'
  | 'TENANT_REPAIR_CREATED'
  | 'TENANT_DUPLICATE_BLOCKED'

type RedirectLogInput = {
  route: string
  userPresent: boolean
  membershipCount?: number | null
  activeOrgCookiePresent?: boolean
  selectedTenantIdPresent?: boolean
  redirectTarget?: string | null
  reasonCode: RedirectReasonCode
}

export function logAuthOrgRedirectDecision(input: RedirectLogInput) {
  console.log('[auth-org-state]', {
    route: input.route,
    userPresent: input.userPresent,
    membershipCount: input.membershipCount ?? null,
    activeOrgCookiePresent: input.activeOrgCookiePresent ?? false,
    selectedTenantIdPresent: input.selectedTenantIdPresent ?? false,
    redirectTarget: input.redirectTarget ?? null,
    reasonCode: input.reasonCode,
  })
}
