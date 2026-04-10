import {
  Injectable,
  ExecutionContext,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { DatabaseService } from '../../database/database.service';
import type { RequestTenant } from '../types/request.types';

@Injectable()
export class TenantGuard {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { tenant?: RequestTenant }>();

    const slug = this.resolveTenantSlug(request);
    if (!slug) {
      throw new BadRequestException('Unable to resolve tenant. Provide x-tenant-slug header or subdomain.');
    }

    const tenant = await this.db.tenant.findFirst({
      where: { slug, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        domain: true,
        isActive: true,
        primaryColor: true,
        timezone: true,
      },
    });

    if (!tenant) {
      this.logger.warn(`Tenant not found or inactive: ${slug}`);
      throw new NotFoundException(`Tenant '${slug}' not found or is inactive.`);
    }

    request.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      domain: tenant.domain,
      isActive: tenant.isActive,
      primaryColor: tenant.primaryColor,
      timezone: tenant.timezone,
    };

    return true;
  }

  private resolveTenantSlug(request: Request): string | null {
    // Priority: header → subdomain → path param
    const headerSlug = request.headers['x-tenant-slug'];
    if (typeof headerSlug === 'string' && headerSlug) return headerSlug;

    const host = request.headers.host ?? '';
    const subdomain = host.split('.')[0];
    const appDomain = process.env.APP_DOMAIN ?? 'orgflow.app';
    const domainParts = appDomain.split('.');
    const hostParts = host.split('.');

    // Only treat as subdomain if it's actually a subdomain of APP_DOMAIN
    if (
      hostParts.length > domainParts.length &&
      subdomain !== 'www' &&
      subdomain !== 'api' &&
      subdomain !== 'localhost'
    ) {
      return subdomain;
    }

    return null;
  }
}
