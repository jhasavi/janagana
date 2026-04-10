import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestUser } from '../types/request.types';

/**
 * Extracts the authenticated user attached by JwtAuthGuard from the request.
 *
 * @example
 * async getProfile(@CurrentUser() user: RequestUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    return request.user;
  },
);
