import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { DatabaseService } from '../../database/database.service';
import { CacheService } from '../../common/cache/cache.service';
import { EmailService } from '../communications/email/email.service';

interface MagicLinkPayload {
  memberId: string;
  tenantId: string;
}

@Injectable()
export class MemberAuthService {
  private readonly tokenTtl = 15 * 60;
  private readonly rateLimitTtl = 60 * 60;
  private readonly maxMagicLinks = 3;
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly appUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly emailService: EmailService,
  ) {
    this.jwtSecret = this.configService.get<string>('jwt.secret') ?? '';
    this.jwtExpiresIn = this.configService.get<string>('jwt.accessExpiresIn') ?? '15m';
    this.appUrl = this.configService.get<string>('app.url') ?? 'http://localhost:3000';
  }

  async sendMagicLink(email: string, tenantSlug: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const tenant = await this.db.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        name: true,
        primaryColor: true,
        logoUrl: true,
        domain: true,
        isActive: true,
      },
    });

    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Tenant not found');
    }

    const member = await this.db.member.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: normalizedEmail } },
      select: { id: true, email: true, firstName: true, lastName: true, tenantId: true },
    });

    if (!member) {
      throw new NotFoundException('No member found for that email address');
    }

    const rateKey = `magic:rate:${tenant.id}:${normalizedEmail}`;
    const currentCount = (await this.cacheService.get<number>(rateKey)) ?? 0;
    if (currentCount >= this.maxMagicLinks) {
      throw new BadRequestException('Too many magic link requests. Please try again later.');
    }
    await this.cacheService.set(rateKey, currentCount + 1, this.rateLimitTtl);

    const token = randomBytes(32).toString('hex');
    const redisKey = `magic:${token}`;
    await this.cacheService.set(redisKey, { memberId: member.id, tenantId: tenant.id }, this.tokenTtl);

    const magicLink = `${this.appUrl}/verify-magic-link?token=${encodeURIComponent(token)}`;
    await this.emailService.sendMagicLink(normalizedEmail, magicLink, {
      id: tenant.id,
      name: tenant.name,
      primaryColor: tenant.primaryColor,
      logoUrl: tenant.logoUrl,
      domain: tenant.domain,
    });

    return { sent: true };
  }

  async verifyMagicLink(token: string) {
    const redisKey = `magic:${token}`;
    const payload = await this.cacheService.get<MagicLinkPayload>(redisKey);
    if (!payload) {
      throw new UnauthorizedException('Magic link is invalid or expired.');
    }

    await this.cacheService.del(redisKey);

    const member = await this.db.member.findUnique({
      where: { id: payload.memberId },
      select: { id: true, email: true, firstName: true, lastName: true, tenantId: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const authToken = this.generateMemberJWT(member.id, member.tenantId);
    return {
      token: authToken,
      member,
    };
  }

  async getMemberFromToken(authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required.');
    }

    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      throw new UnauthorizedException('Authorization header is invalid.');
    }

    const payload = this.verifyMemberJWT(token);
    const member = await this.db.member.findUnique({
      where: { id: payload.memberId },
      select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, tenantId: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  async loginWithPassword(email: string, password: string, tenantSlug: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const tenant = await this.db.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, isActive: true },
    });

    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Tenant not found');
    }

    const user = await this.db.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: normalizedEmail } },
      select: { hashedPassword: true },
    });

    if (!user || !user.hashedPassword) {
      throw new UnauthorizedException('No password login configured for this account.');
    }

    if (!this.verifyPassword(password, user.hashedPassword)) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const member = await this.db.member.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: normalizedEmail } },
      select: { id: true, email: true, firstName: true, lastName: true, tenantId: true },
    });

    if (!member) {
      throw new NotFoundException('Member account not found');
    }

    const authToken = this.generateMemberJWT(member.id, member.tenantId);
    return {
      token: authToken,
      member,
    };
  }

  async setMemberPassword(tenantId: string, email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.db.user.findUnique({
      where: { tenantId_email: { tenantId, email: normalizedEmail } },
      select: { id: true, role: true },
    });

    const hashedPassword = this.hashPassword(password);

    if (user) {
      if (user.role !== 'READONLY') {
        throw new BadRequestException('A staff account already exists with this email address.');
      }
      await this.db.user.update({
        where: { id: user.id },
        data: { hashedPassword },
      });
      return;
    }

    await this.db.user.create({
      data: {
        tenantId,
        email: normalizedEmail,
        fullName: '',
        role: 'READONLY',
        hashedPassword,
      },
    });
  }

  generateMemberJWT(memberId: string, tenantId: string) {
    return jwt.sign({ memberId, tenantId, role: 'member' }, this.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: this.jwtExpiresIn,
    });
  }

  verifyMemberJWT(token: string) {
    try {
      const payload = jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'] });
      return payload as { memberId: string; tenantId: string };
    } catch (error) {
      throw new UnauthorizedException('Invalid member token.');
    }
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const derived = scryptSync(password, salt, 64).toString('hex');
    return `${salt}$${derived}`;
  }

  private verifyPassword(password: string, stored: string) {
    const [salt, storedHash] = stored.split('$');
    if (!salt || !storedHash) return false;
    const derived = scryptSync(password, salt, 64).toString('hex');
    const bufferA = Buffer.from(storedHash, 'hex');
    const bufferB = Buffer.from(derived, 'hex');
    return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
  }
}
