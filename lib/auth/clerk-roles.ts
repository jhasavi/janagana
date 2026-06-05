export function normalizeClerkOrgRole(role: string | null | undefined): string {
  return String(role ?? "").trim().toLowerCase();
}

export function isClerkOrgAdminRole(role: string | null | undefined): boolean {
  const normalized = normalizeClerkOrgRole(role);
  return normalized === "owner" || normalized === "admin" || normalized === "org:owner" || normalized === "org:admin";
}

export function clerkOrgRoleLabel(role: string | null | undefined): string {
  const normalized = normalizeClerkOrgRole(role);
  if (normalized === "owner" || normalized === "org:owner") return "Owner";
  if (normalized === "admin" || normalized === "org:admin") return "Admin";
  if (normalized === "member" || normalized === "org:member") return "Member";
  return role ? String(role) : "Member";
}
