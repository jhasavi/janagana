import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import type { RequestTenant } from '../types/request.types';

/**
 * Resolves the tenant slug from the incoming request and attaches it as the
 * `x-tenant-slug` header so downstream guards can pick it up.
 *
 * Resolution order:
 *   1. `x-tenant-slug` header already present → pass through
 *   2. Subdomain of APP_DOMAIN (e.g. `acme.orgflow.app`)
 *   3. Custom domain exact-match (deferred to TenantGuard DB lookup)
 */
@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantResolverMiddleware.name);
  private readonly appDomain = process.env.APP_DOMAIN ?? 'orgflow.app';

  use(
    request: Request & { tenant?: RequestTenant },
    _response: Response,
    next: NextFunction,
  ): void {
    // Already resolved (e.g. by a reverse proxy)
    if (request.headers['x-tenant-slug']) {
      next();
      return;
    }

    const host = (request.headers.host ?? '').split(':')[0]; // strip port
    const slug = this.extractSubdomain(host);

    if (slug) {
      this.logger.verbose(`Resolved tenant slug '${slug}' from host '${host}'`);
      // Mutate the headers object so downstream code reads the header
      (request.headers as Record<string, string>)['x-tenant-slug'] = slug;
    } else {
      this.logger.verbose(`No tenant slug resolved from host '${host}'`);
    }

    next();
  }

  private extractSubdomain(host: string): string | null {
    const domainParts = this.appDomain.split('.');
    const hostParts = host.split('.');

    // Subdomain detection: host must have more parts than the base domain
    if (hostParts.length <= domainParts.length) return null;

    const subdomain = hostParts[0];
    const reserved = new Set(['www', 'api', 'app', 'mail', 'localhost']);
    if (!subdomain || reserved.has(subdomain)) return null;

    return subdomain;
  }
}
