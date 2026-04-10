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
import type { RequestUser } from '../types/request.types';

/** Clerk always issues RS256 tokens — the same JWKS endpoint is used for both
 *  admin users and members.  This guard is a lighter alias kept for semantic
 *  clarity when protecting member-portal routes. */
@Injectable()
export class MemberAuthGuard {
  private readonly logger = new Logger(MemberAuthGuard.name);
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
      cacheMaxAge: 10 * 60 * 1000,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing Authorization token for member route.');
    }

    try {
      const payload = await this.verifyToken(token);
      const meta = (payload as jwt.JwtPayload & { public_metadata?: Record<string, unknown> })
        .public_metadata ?? {};
      const role = (meta['role'] as RequestUser['role'] | undefined) ?? 'member';

      request.user = {
        clerkId: (payload as jwt.JwtPayload).sub ?? '',
        email: (payload as jwt.JwtPayload & { email?: string }).email ?? '',
        firstName: (payload as jwt.JwtPayload & { first_name?: string }).first_name ?? '',
        lastName: (payload as jwt.JwtPayload & { last_name?: string }).last_name ?? '',
        avatarUrl: (payload as jwt.JwtPayload & { image_url?: string }).image_url ?? null,
        role,
        tenantId: (meta['tenantId'] as string | undefined) ?? null,
      };

      return true;
    } catch (err) {
      this.logger.warn(`Member JWT verification failed: ${String(err)}`);
      throw new UnauthorizedException('Invalid or expired member token.');
    }
  }

  private extractBearerToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.slice(7);
  }

  private async verifyToken(token: string): Promise<jwt.JwtPayload> {
    const secret = this.configService.get<string>('jwt.secret');
    if (secret) {
      try {
        return jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
      } catch {
        // fallback to Clerk-issued RS256 tokens below
      }
    }

    return new Promise((resolve, reject) => {
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

        jwt.verify(
          token,
          key.getPublicKey(),
          { algorithms: ['RS256'] },
          (verifyErr, payload) => {
            if (verifyErr) reject(verifyErr);
            else resolve(payload as jwt.JwtPayload);
          },
        );
      });
    });
  }
}
