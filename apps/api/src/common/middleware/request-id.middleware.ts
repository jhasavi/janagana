import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      requestId?: string;
    }
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private logger = new Logger(RequestIdMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Generate or use existing request ID
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    
    // Attach to request
    req.id = requestId;
    req.requestId = requestId;
    
    // Add to response headers
    res.setHeader('X-Request-ID', requestId);
    
    // Log request start
    this.logger.debug(`Request started: ${req.method} ${req.url}`, {
      requestId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    // Log response
    const originalSend = res.send;
    res.send = function (data) {
      res.on('finish', () => {
        const duration = Date.now() - (req as any).startTime;
        const logData = {
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
        };
        
        if (res.statusCode >= 500) {
          this.logger.error(`Request failed: ${req.method} ${req.url}`, logData);
        } else if (res.statusCode >= 400) {
          this.logger.warn(`Request error: ${req.method} ${req.url}`, logData);
        } else {
          this.logger.debug(`Request completed: ${req.method} ${req.url}`, logData);
        }
      });
      return originalSend.call(this, data);
    }.bind(res);
    
    // Track start time
    (req as any).startTime = Date.now();
    
    next();
  }
}
