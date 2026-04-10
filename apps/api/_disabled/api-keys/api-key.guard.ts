import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from './api-keys.service';

export const API_KEY_SCOPE_KEY = 'apiKeyScope';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const requiredScope = this.reflector.getAllAndOverride<string>(API_KEY_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Extract API key from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('API key is required');
    }

    // Support both "Bearer <key>" and just "<key>" formats
    const apiKey = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    // Validate API key
    const validation = await this.apiKeysService.validateApiKey(apiKey);
    if (!validation) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Check scope if required
    if (requiredScope) {
      const scopeHierarchy = {
        ADMIN: 3,
        WRITE: 2,
        READ: 1,
      };

      const requiredLevel = scopeHierarchy[requiredScope as keyof typeof scopeHierarchy];
      const userLevel = scopeHierarchy[validation.scope as keyof typeof scopeHierarchy];

      if (userLevel < requiredLevel) {
        throw new ForbiddenException(
          `API key scope ${validation.scope} is insufficient for this operation`,
        );
      }
    }

    // Attach API key info to request for later use
    request.apiKey = {
      tenantId: validation.tenantId,
      apiKeyId: validation.apiKeyId,
      scope: validation.scope,
    };

    // Update last used timestamp
    await this.apiKeysService.updateLastUsed(validation.apiKeyId);

    return true;
  }
}
