export type AuthMode = "REAL_CLERK";

export const AUTH_MODE: AuthMode = "REAL_CLERK";

export { getCurrentUser, type CurrentUserSummary } from "./current-user";
export { getUserClerkOrganizations } from "./clerk-orgs";
export { clerkOrgRoleLabel, isClerkOrgAdminRole } from "./clerk-roles";
export { getDashboardAccessForTenant } from "./dashboard-access";
