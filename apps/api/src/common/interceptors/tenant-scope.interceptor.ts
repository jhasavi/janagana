import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import type { RequestTenant } from '../types/request.types';

/**
 * Makes the resolved `request.tenant.id` available as `request.tenantId`
 * (a plain string shortcut) so services can access it without always
 * drilling through the full tenant object.
 *
 * This interceptor runs after TenantGuard has set `request.tenant`.
 */
@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantScopeInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { tenant?: RequestTenant; tenantId?: string }>();

    if (request.tenant) {
      request.tenantId = request.tenant.id;
    } else {
      this.logger.verbose('No tenant on request — tenantId not set.');
    }

    return next.handle();
  }
}
