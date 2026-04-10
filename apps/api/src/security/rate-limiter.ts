import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerLimitDetail,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RateLimiterGuard extends ThrottlerGuard {
  constructor(
    protected readonly options: ThrottlerModuleOptions,
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (typeof req?.headers?.['x-tenant-slug'] === 'string') {
      return req.headers['x-tenant-slug'];
    }
    return String(req.ip ?? (await super.getTracker(req)));
  }

  protected async throwThrottlingException(
    _context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      `Rate limit exceeded: ${detail.limit} requests per ${detail.ttl} seconds.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
