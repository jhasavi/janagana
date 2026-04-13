import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY, PERMISSIONS_KEY } from '../decorators/roles.decorator';
import type { RequestUser } from '../types/request.types';
import {
  OrgFlowRole,
  Permission,
  ROLE_PRESETS,
  RoleType,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions
} from '@janagana/types';

/** Numeric hierarchy — higher is more privileged. */
const ROLE_HIERARCHY: Record<OrgFlowRole, number> = {
  owner: 5,
  admin: 4,
  staff: 3,
  readonly: 2,
  member: 1,
};

@Injectable()
export class RolesGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<OrgFlowRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() or @Permissions() decorator — allow any authenticated user through
    if ((!requiredRoles || requiredRoles.length === 0) &&
        (!requiredPermissions || requiredPermissions.length === 0)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User context not found on request.');
    }

    if (requiredRoles && requiredRoles.length > 0) {
      const userLevel = ROLE_HIERARCHY[user.role as OrgFlowRole] ?? 0;
      const hasRole = requiredRoles.some((r) => userLevel >= ROLE_HIERARCHY[r as OrgFlowRole]);

      if (!hasRole) {
        throw new ForbiddenException(
          `Role '${user.role}' is not allowed. Required: ${requiredRoles.join(' | ')}.`,
        );
      }
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      // Get permissions from role presets (in a real implementation, this would come from the database)
      const roleType = user.role.toUpperCase() as RoleType;
      const userPermissions = ROLE_PRESETS[roleType] ?? [];
      
      // Check if user has any of the required permissions
      const hasRequiredPermission = hasAnyPermission(userPermissions, requiredPermissions);

      if (!hasRequiredPermission) {
        throw new ForbiddenException(
          `Permission denied. Role '${user.role}' does not include one of: ${requiredPermissions.join(' | ')}.`,
        );
      }
    }

    return true;
  }
}
