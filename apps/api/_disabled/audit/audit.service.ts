import { Injectable } from '@nestjs/common';
import { CustomLogger } from '../logger/logger.service';
import { PrismaService } from '@janagana/database';
import { Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';

interface AuditLogData {
  action: string;
  entityType: string;
  entityId: string;
  actor: string; // userId or 'system'
  actorType: 'user' | 'system' | 'api_key';
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private logger = new CustomLogger();
  private auditLogPath: string;

  constructor(private prisma: PrismaService) {
    this.logger.setContext('AUDIT');
    this.auditLogPath = path.join(process.cwd(), 'logs', 'audit.log');
    this.ensureAuditLogDirectory();
  }

  // Ensure audit log directory exists
  private ensureAuditLogDirectory() {
    const dir = path.dirname(this.auditLogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Log an audit event
  async log(data: AuditLogData, req?: Request) {
    const timestamp = new Date().toISOString();
    
    // Extract request context if available
    if (req) {
      data.ipAddress = req.ip;
      data.userAgent = req.headers['user-agent'];
      data.tenantId = (req as any).tenantId;
      if (!data.actor && (req as any).userId) {
        data.actor = (req as any).userId;
        data.actorType = 'user';
      }
    }

    // Create audit log entry in database
    try {
      await this.prisma.auditLog.create({
        data: {
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          actor: data.actor,
          actorType: data.actorType,
          oldValue: data.oldValue ? JSON.stringify(data.oldValue) : null,
          newValue: data.newValue ? JSON.stringify(data.newValue) : null,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          tenantId: data.tenantId,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          timestamp: new Date(timestamp),
        },
      });
    } catch (error) {
      this.logger.error('Failed to write audit log to database', error as string);
    }

    // Write to audit log file
    this.writeToFile(data, timestamp);

    // Log to main logger
    this.logger.logAudit(data.action, data.entityType, data.entityId, data.actor, {
      oldValue: data.oldValue,
      newValue: data.newValue,
      tenantId: data.tenantId,
      ipAddress: data.ipAddress,
    });
  }

  // Write to audit log file
  private writeToFile(data: AuditLogData, timestamp: string) {
    const logEntry = {
      timestamp,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      actor: data.actor,
      actorType: data.actorType,
      oldValue: data.oldValue,
      newValue: data.newValue,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      tenantId: data.tenantId,
      metadata: data.metadata,
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      fs.appendFileSync(this.auditLogPath, logLine, 'utf8');
    } catch (error) {
      this.logger.error('Failed to write audit log to file', error as string);
    }
  }

  // Query audit logs
  async query(filters: {
    tenantId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    actor?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.actor) where.actor = filters.actor;
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        ...log,
        oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
        newValue: log.newValue ? JSON.parse(log.newValue) : null,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
      total,
    };
  }

  // Export audit logs for compliance
  async export(filters: {
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { logs } = await this.query({
      ...filters,
      limit: 10000, // Export up to 10,000 records
    });

    // Convert to CSV format
    const headers = ['timestamp', 'action', 'entityType', 'entityId', 'actor', 'actorType', 'ipAddress', 'tenantId'];
    const csvRows = [headers.join(',')];

    logs.forEach((log) => {
      const row = [
        log.timestamp.toISOString(),
        log.action,
        log.entityType,
        log.entityId,
        log.actor,
        log.actorType,
        log.ipAddress || '',
        log.tenantId || '',
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  // Helper methods for common audit actions
  async logMemberCreated(memberId: string, data: any, actor: string, req?: Request) {
    await this.log({
      action: 'member.created',
      entityType: 'Member',
      entityId: memberId,
      actor,
      actorType: 'user',
      newValue: data,
      metadata: { email: data.email },
    }, req);
  }

  async logMemberUpdated(memberId: string, oldValue: any, newValue: any, actor: string, req?: Request) {
    await this.log({
      action: 'member.updated',
      entityType: 'Member',
      entityId: memberId,
      actor,
      actorType: 'user',
      oldValue,
      newValue,
    }, req);
  }

  async logMemberDeleted(memberId: string, oldValue: any, actor: string, req?: Request) {
    await this.log({
      action: 'member.deleted',
      entityType: 'Member',
      entityId: memberId,
      actor,
      actorType: 'user',
      oldValue,
    }, req);
  }

  async logMemberStatusChanged(memberId: string, oldStatus: string, newStatus: string, actor: string, req?: Request) {
    await this.log({
      action: 'member.status_changed',
      entityType: 'Member',
      entityId: memberId,
      actor,
      actorType: 'user',
      oldValue: { status: oldStatus },
      newValue: { status: newStatus },
    }, req);
  }

  async logEventCreated(eventId: string, data: any, actor: string, req?: Request) {
    await this.log({
      action: 'event.created',
      entityType: 'Event',
      entityId: eventId,
      actor,
      actorType: 'user',
      newValue: data,
      metadata: { title: data.title },
    }, req);
  }

  async logEventUpdated(eventId: string, oldValue: any, newValue: any, actor: string, req?: Request) {
    await this.log({
      action: 'event.updated',
      entityType: 'Event',
      entityId: eventId,
      actor,
      actorType: 'user',
      oldValue,
      newValue,
    }, req);
  }

  async logEventDeleted(eventId: string, oldValue: any, actor: string, req?: Request) {
    await this.log({
      action: 'event.deleted',
      entityType: 'Event',
      entityId: eventId,
      actor,
      actorType: 'user',
      oldValue,
    }, req);
  }

  async logPaymentProcessed(paymentId: string, amount: number, actor: string, req?: Request) {
    await this.log({
      action: 'payment.processed',
      entityType: 'Payment',
      entityId: paymentId,
      actor,
      actorType: 'system',
      newValue: { amount },
      metadata: { amount },
    }, req);
  }

  async logPaymentFailed(paymentId: string, reason: string, actor: string, req?: Request) {
    await this.log({
      action: 'payment.failed',
      entityType: 'Payment',
      entityId: paymentId,
      actor,
      actorType: 'system',
      metadata: { reason },
    }, req);
  }

  async logLogin(userId: string, req: Request) {
    await this.log({
      action: 'auth.login',
      entityType: 'User',
      entityId: userId,
      actor: userId,
      actorType: 'user',
      metadata: { successful: true },
    }, req);
  }

  async logLogout(userId: string, req: Request) {
    await this.log({
      action: 'auth.logout',
      entityType: 'User',
      entityId: userId,
      actor: userId,
      actorType: 'user',
    }, req);
  }

  async logPermissionGranted(userId: string, permission: string, actor: string, req?: Request) {
    await this.log({
      action: 'permission.granted',
      entityType: 'User',
      entityId: userId,
      actor,
      actorType: 'user',
      newValue: { permission },
      metadata: { permission },
    }, req);
  }

  async logPermissionRevoked(userId: string, permission: string, actor: string, req?: Request) {
    await this.log({
      action: 'permission.revoked',
      entityType: 'User',
      entityId: userId,
      actor,
      actorType: 'user',
      oldValue: { permission },
      metadata: { permission },
    }, req);
  }

  async logApiCall(apiKeyId: string, endpoint: string, method: string, req?: Request) {
    await this.log({
      action: 'api.call',
      entityType: 'ApiKey',
      entityId: apiKeyId,
      actor: apiKeyId,
      actorType: 'api_key',
      metadata: { endpoint, method },
    }, req);
  }
}
