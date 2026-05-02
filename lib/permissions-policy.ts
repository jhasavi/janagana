export type TenantActionPermission =
  | 'bulk_preview'
  | 'bulk_assign_tags'
  | 'bulk_archive'
  | 'bulk_restore'
  | 'bulk_restore_recent'
  | 'import_preview'
  | 'import_commit_safe'
  | 'import_commit_overwrite'
  | 'duplicates_merge'

function normalizeRole(rawRole: string) {
  const role = String(rawRole ?? '').toLowerCase()
  if (!role) return ''

  if (role.includes(':')) {
    const [, suffix] = role.split(':')
    return suffix ?? role
  }

  return role
}

const OWNER_ONLY_ACTIONS = new Set<TenantActionPermission>([
  'bulk_archive',
  'bulk_restore',
  'bulk_restore_recent',
  'import_commit_overwrite',
  'duplicates_merge',
])

const ADMIN_OR_OWNER_ACTIONS = new Set<TenantActionPermission>([
  'bulk_preview',
  'bulk_assign_tags',
  'import_preview',
  'import_commit_safe',
])

export function roleCanPerformAction(role: string, action: TenantActionPermission) {
  const normalized = normalizeRole(role)
  if (normalized === 'owner') return true

  if (normalized === 'admin') {
    return ADMIN_OR_OWNER_ACTIONS.has(action)
  }

  return false
}

export function isAdminOrOwnerRole(role: string) {
  const normalized = normalizeRole(role)
  return normalized === 'admin' || normalized === 'owner'
}

export function ownerOnlyAction(action: TenantActionPermission) {
  return OWNER_ONLY_ACTIONS.has(action)
}
