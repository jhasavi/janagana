import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { Request } from 'express';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Custom log format
const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, context, requestId, tenantId, userId, ...meta }) => {
    const logObj: any = {
      timestamp,
      level,
      message,
      ...(requestId && { requestId }),
      ...(tenantId && { tenantId }),
      ...(userId && { userId }),
      ...(context && { context }),
      ...(Object.keys(meta).length > 0 && { ...meta }),
    };

    if (isProduction) {
      return JSON.stringify(logObj);
    }

    // Pretty print for development
    const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level.toUpperCase()}]${requestId ? ` [${requestId}]` : ''}${tenantId ? ` [Tenant: ${tenantId}]` : ''}${userId ? ` [User: ${userId}]` : ''}${context ? ` [${context}]` : ''}: ${message} ${metaString}`;
  }),
);

// Create Winston logger
const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: customFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: isDevelopment
        ? winston.format.combine(
            winston.format.colorize(),
            customFormat,
          )
        : customFormat,
    }),

    // Error log file (all errors)
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: customFormat,
    }),

    // Combined log file (all levels)
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: customFormat,
    }),
  ],
});

@Injectable()
export class CustomLogger implements LoggerService {
  private context?: string;
  private requestId?: string;
  private tenantId?: string;
  private userId?: string;

  setContext(context: string): void {
    this.context = context;
  }

  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  log(message: any, context?: string): any {
    logger.info(message, {
      context: context || this.context,
      requestId: this.requestId,
      tenantId: this.tenantId,
      userId: this.userId,
    });
  }

  error(message: any, trace?: string, context?: string): any {
    logger.error(message, {
      context: context || this.context,
      requestId: this.requestId,
      tenantId: this.tenantId,
      userId: this.userId,
      trace,
    });
  }

  warn(message: any, context?: string): any {
    logger.warn(message, {
      context: context || this.context,
      requestId: this.requestId,
      tenantId: this.tenantId,
      userId: this.userId,
    });
  }

  debug(message: any, context?: string): any {
    logger.debug(message, {
      context: context || this.context,
      requestId: this.requestId,
      tenantId: this.tenantId,
      userId: this.userId,
    });
  }

  verbose(message: any, context?: string): any {
    logger.verbose(message, {
      context: context || this.context,
      requestId: this.requestId,
      tenantId: this.tenantId,
      userId: this.userId,
    });
  }

  // Helper to log with request context
  logRequest(req: Request, message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const requestId = req.headers['x-request-id'] as string;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    logger[level](message, {
      context: 'HTTP',
      requestId,
      tenantId,
      userId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // Helper to log audit events
  logAudit(action: string, entityType: string, entityId: string, actor: string, changes?: any) {
    logger.info(`Audit: ${action}`, {
      context: 'AUDIT',
      action,
      entityType,
      entityId,
      actor,
      changes,
      timestamp: new Date().toISOString(),
    });
  }

  // Helper to log performance metrics
  logPerformance(operation: string, duration: number, metadata?: any) {
    logger.info(`Performance: ${operation}`, {
      context: 'PERFORMANCE',
      operation,
      duration,
      unit: 'ms',
      ...metadata,
    });
  }
}

// Create a logger instance
export const logger = new CustomLogger();
