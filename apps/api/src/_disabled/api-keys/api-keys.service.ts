import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { randomBytes, createHash } from 'crypto';
import { ApiKeyScope } from '@prisma/client';

export interface CreateApiKeyDto {
  name: string;
  scope?: ApiKeyScope;
  rateLimit?: number;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdateApiKeyDto {
  name?: string;
  scope?: ApiKeyScope;
  isActive?: boolean;
  rateLimit?: number;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ApiKeyResponseDto {
  id: string;
  name: string;
  keyPrefix: string;
  key: string; // Only shown on creation
  scope: ApiKeyScope;
  isActive: boolean;
  rateLimit: number;
  lastUsedAt?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ApiKeysService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a new API key
   */
  async createApiKey(
    tenantId: string,
    dto: CreateApiKeyDto,
  ): Promise<ApiKeyResponseDto> {
    // Generate API key
    const apiKey = this.generateApiKey();
    const keyHash = this.hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 8);

    // Create API key record
    const apiKeyRecord = await this.db.apiKey.create({
      data: {
        tenantId,
        name: dto.name,
        keyHash,
        keyPrefix,
        scope: dto.scope || ApiKeyScope.READ,
        isActive: true,
        rateLimit: dto.rateLimit || 1000,
        expiresAt: dto.expiresAt,
        metadata: dto.metadata as any,
      },
    });

    return {
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      keyPrefix: apiKeyRecord.keyPrefix,
      key: apiKey, // Only returned on creation
      scope: apiKeyRecord.scope,
      isActive: apiKeyRecord.isActive,
      rateLimit: apiKeyRecord.rateLimit,
      lastUsedAt: apiKeyRecord.lastUsedAt?.toISOString(),
      expiresAt: apiKeyRecord.expiresAt?.toISOString(),
      metadata: apiKeyRecord.metadata as Record<string, unknown>,
      createdAt: apiKeyRecord.createdAt.toISOString(),
      updatedAt: apiKeyRecord.updatedAt.toISOString(),
    };
  }

  /**
   * List all API keys for a tenant
   */
  async listApiKeys(tenantId: string): Promise<Omit<ApiKeyResponseDto, 'key'>[]> {
    const apiKeys = await this.db.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scope: key.scope,
      isActive: key.isActive,
      rateLimit: key.rateLimit,
      lastUsedAt: key.lastUsedAt?.toISOString(),
      expiresAt: key.expiresAt?.toISOString(),
      metadata: key.metadata as Record<string, unknown>,
      createdAt: key.createdAt.toISOString(),
      updatedAt: key.updatedAt.toISOString(),
    }));
  }

  /**
   * Get a single API key (without the actual key)
   */
  async getApiKey(
    tenantId: string,
    apiKeyId: string,
  ): Promise<Omit<ApiKeyResponseDto, 'key'>> {
    const apiKey = await this.db.apiKey.findFirst({
      where: {
        id: apiKeyId,
        tenantId,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scope: apiKey.scope,
      isActive: apiKey.isActive,
      rateLimit: apiKey.rateLimit,
      lastUsedAt: apiKey.lastUsedAt?.toISOString(),
      expiresAt: apiKey.expiresAt?.toISOString(),
      metadata: apiKey.metadata as Record<string, unknown>,
      createdAt: apiKey.createdAt.toISOString(),
      updatedAt: apiKey.updatedAt.toISOString(),
    };
  }

  /**
   * Update an API key
   */
  async updateApiKey(
    tenantId: string,
    apiKeyId: string,
    dto: UpdateApiKeyDto,
  ): Promise<Omit<ApiKeyResponseDto, 'key'>> {
    const apiKey = await this.db.apiKey.findFirst({
      where: {
        id: apiKeyId,
        tenantId,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const updated = await this.db.apiKey.update({
      where: { id: apiKeyId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.scope !== undefined && { scope: dto.scope }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.rateLimit !== undefined && { rateLimit: dto.rateLimit }),
        ...(dto.expiresAt !== undefined && { expiresAt: dto.expiresAt }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata as any }),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      keyPrefix: updated.keyPrefix,
      scope: updated.scope,
      isActive: updated.isActive,
      rateLimit: updated.rateLimit,
      lastUsedAt: updated.lastUsedAt?.toISOString(),
      expiresAt: updated.expiresAt?.toISOString(),
      metadata: updated.metadata as Record<string, unknown>,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(tenantId: string, apiKeyId: string): Promise<void> {
    const apiKey = await this.db.apiKey.findFirst({
      where: {
        id: apiKeyId,
        tenantId,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.db.apiKey.delete({
      where: { id: apiKeyId },
    });
  }

  /**
   * Validate an API key and return the associated tenant
   */
  async validateApiKey(apiKey: string): Promise<{
    tenantId: string;
    apiKeyId: string;
    scope: ApiKeyScope;
    isActive: boolean;
    expiresAt?: Date;
  } | null> {
    const keyHash = this.hashApiKey(apiKey);

    const apiKeyRecord = await this.db.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        tenantId: true,
        scope: true,
        isActive: true,
        expiresAt: true,
      },
    });

    if (!apiKeyRecord) {
      return null;
    }

    // Check if API key is active
    if (!apiKeyRecord.isActive) {
      return null;
    }

    // Check if API key has expired
    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      return null;
    }

    return {
      tenantId: apiKeyRecord.tenantId,
      apiKeyId: apiKeyRecord.id,
      scope: apiKeyRecord.scope,
      isActive: apiKeyRecord.isActive,
      expiresAt: apiKeyRecord.expiresAt,
    };
  }

  /**
   * Update last used timestamp for an API key
   */
  async updateLastUsed(apiKeyId: string): Promise<void> {
    await this.db.apiKey.update({
      where: { id: apiKeyId },
      data: { lastUsedAt: new Date() },
    });
  }

  /**
   * Rotate an API key (generate new key, keep same metadata)
   */
  async rotateApiKey(
    tenantId: string,
    apiKeyId: string,
  ): Promise<ApiKeyResponseDto> {
    const apiKey = await this.db.apiKey.findFirst({
      where: {
        id: apiKeyId,
        tenantId,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    // Generate new API key
    const newApiKey = this.generateApiKey();
    const newKeyHash = this.hashApiKey(newApiKey);
    const newKeyPrefix = newApiKey.substring(0, 8);

    const updated = await this.db.apiKey.update({
      where: { id: apiKeyId },
      data: {
        keyHash: newKeyHash,
        keyPrefix: newKeyPrefix,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      keyPrefix: updated.keyPrefix,
      key: newApiKey, // Only returned on rotation
      scope: updated.scope,
      isActive: updated.isActive,
      rateLimit: updated.rateLimit,
      lastUsedAt: updated.lastUsedAt?.toISOString(),
      expiresAt: updated.expiresAt?.toISOString(),
      metadata: updated.metadata as Record<string, unknown>,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Generate a random API key
   */
  private generateApiKey(): string {
    const prefix = 'of_';
    const randomPart = randomBytes(32).toString('base64url');
    return `${prefix}${randomPart}`;
  }

  /**
   * Hash an API key for storage
   */
  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }
}
