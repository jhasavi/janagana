import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

/** Minimal subset of Prisma errors used for matching — avoids importing
 *  @prisma/client at compile time when Prisma may not be available. */
interface PrismaClientKnownRequestError extends Error {
  code: string;
  meta?: Record<string, unknown>;
  clientVersion: string;
}

function isPrismaError(err: unknown): err is PrismaClientKnownRequestError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'clientVersion' in err &&
    'code' in err &&
    typeof (err as Record<string, unknown>)['code'] === 'string'
  );
}

const PRISMA_CODE_MAP: Record<string, { status: HttpStatus; message: string }> = {
  P2000: { status: HttpStatus.BAD_REQUEST, message: 'Value too long for column.' },
  P2001: { status: HttpStatus.NOT_FOUND, message: 'Record not found.' },
  P2002: { status: HttpStatus.CONFLICT, message: 'Unique constraint violation.' },
  P2003: { status: HttpStatus.BAD_REQUEST, message: 'Foreign key constraint failed.' },
  P2004: { status: HttpStatus.BAD_REQUEST, message: 'Constraint failed on the database.' },
  P2005: { status: HttpStatus.BAD_REQUEST, message: 'Invalid value for field.' },
  P2006: { status: HttpStatus.BAD_REQUEST, message: 'Provided value is not valid.' },
  P2011: { status: HttpStatus.BAD_REQUEST, message: 'Null constraint violation.' },
  P2014: { status: HttpStatus.BAD_REQUEST, message: 'Relation violation.' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Record to update or delete not found.' },
};

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (!isPrismaError(exception)) {
      // Re-throw non-Prisma errors so HttpExceptionFilter handles them
      const status = HttpStatus.INTERNAL_SERVER_ERROR;
      this.logger.error(
        `${request.method} ${request.url} → unhandled: ${String(exception)}`,
      );
      response.status(status).json({
        success: false,
        error: { code: status, message: 'Internal server error.' },
      });
      return;
    }

    const mapped = PRISMA_CODE_MAP[exception.code] ?? {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error.',
    };

    this.logger.warn(
      `${request.method} ${request.url} → Prisma ${exception.code}: ${mapped.message}`,
    );
    Sentry.captureException(exception);

    response.status(mapped.status).json({
      success: false,
      error: {
        code: mapped.status,
        message: mapped.message,
        details: { prismaCode: exception.code, meta: exception.meta },
      },
    });
  }
}
