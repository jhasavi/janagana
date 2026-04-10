import type { OrgFlowRole } from '../decorators/roles.decorator';

/** Shape attached to `request.user` after JWT validation. */
export interface RequestUser {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: OrgFlowRole;
  tenantId: string | null;
}

/** Shape attached to `request.tenant` after tenant resolution. */
export interface RequestTenant {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  isActive: boolean;
  primaryColor: string | null;
  timezone: string;
}
