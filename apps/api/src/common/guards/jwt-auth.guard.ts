import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import jwksRsa, { JwksClient, SigningKey } from 'jwks-rsa';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { OrgFlowRole } from '../decorators/roles.decorator';
import type { RequestUser } from '../types/request.types';

/** Decoded payload shape from a Clerk-issued JWT. */
interface ClerkJwtPayload extends jwt.JwtPayload {
  sub: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  image_url?: string;
  metadata?: {
    role?: OrgFlowRole;
    tenantId?: string;
  };
  public_metadata?: {
    role?: OrgFlowRole;
    tenantId?: string;
  };
}

@Injectable()
export class JwtAuthGuard {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly jwksClient: JwksClient;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    const jwksUri =
      this.configService.get<string>('jwt.clerkJwksUrl') ??
      'https://api.clerk.com/.well-known/jwks.json';

    this.jwksClient = jwksRsa({
      jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 10 * 60 * 1000, // 10 minutes
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Respect @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing or malformed Authorization header.');
    }

    try {
      const payload = await this.verifyToken(token);
      const metadata = payload.public_metadata ?? payload.metadata ?? {};

      request.user = {
        clerkId: payload.sub,
        email: payload.email ?? '',
        firstName: payload.first_name ?? '',
        lastName: payload.last_name ?? '',
        avatarUrl: payload.image_url ?? null,
        role: (metadata.role as OrgFlowRole | undefined) ?? 'readonly',
        tenantId: (metadata.tenantId as string | undefined) ?? null,
      };

      return true;
    } catch (err) {
      this.logger.warn(`JWT verification failed: ${String(err)}`);
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  private extractBearerToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.slice(7);
  }

  private async verifyToken(token: string): Promise<ClerkJwtPayload> {
    return new Promise((resolve, reject) => {
      // Decode first to get the kid
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
        reject(new Error('Unable to decode token header.'));
        return;
      }

      this.jwksClient.getSigningKey(decoded.header.kid, (err: Error | null, key: SigningKey | undefined) => {
        if (err || !key) {
          reject(err ?? new Error('Signing key not found.'));
          return;
        }

        const publicKey = key.getPublicKey();
        jwt.verify(
          token,
          publicKey,
          { algorithms: ['RS256'] },
          (verifyErr, payload) => {
            if (verifyErr) {
              reject(verifyErr);
            } else {
              resolve(payload as ClerkJwtPayload);
            }
          },
        );
      });
    });
  }
}
