import { SetMetadata } from '@nestjs/common';
import type { OrgFlowRole, Permission } from '@orgflow/types';

export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';

/**
 * Restricts a route to users who hold at least one of the given roles within
 * the current tenant.
 *
 * @example
 * @Roles('admin', 'owner')
 * @Get()
 * list() { ... }
 */
export const Roles = (...roles: OrgFlowRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Restricts a route to users who hold at least one of the given permissions.
 *
 * @example
 * @Permissions('users:read')
 * @Get()
 * list() { ... }
 */
export const Permissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
