import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;
    let details: unknown;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const r = exceptionResponse as Record<string, unknown>;
      message = (r['message'] as string | string[]) instanceof Array
        ? (r['message'] as string[]).join(', ')
        : ((r['message'] as string | undefined) ?? exception.message);
      details = r['errors'] ?? undefined;
    } else {
      message = exception.message;
    }

    // Only log 5xx as errors; 4xx as warnings
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} → ${status}: ${message}`, exception.stack);
      Sentry.captureException(exception);
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${status}: ${message}`);
    }

    response.status(status).json({
      success: false,
      error: {
        code: status,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    });
  }
}
