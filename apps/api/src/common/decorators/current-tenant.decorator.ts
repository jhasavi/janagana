import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestTenant } from '../types/request.types';

/**
 * Extracts the resolved tenant attached by TenantGuard from the request.
 *
 * @example
 * async listMembers(@CurrentTenant() tenant: RequestTenant) { ... }
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestTenant | undefined => {
    const request = ctx.switchToHttp().getRequest<Request & { tenant?: RequestTenant }>();
    return request.tenant;
  },
);
