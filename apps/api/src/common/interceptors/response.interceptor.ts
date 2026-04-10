import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/** A controller can return either raw data or a pre-shaped paginated result. */
export interface PaginatedResult<T> {
  data: T;
  meta: PaginationMeta;
}

function isPaginatedResult<T>(value: unknown): value is PaginatedResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value &&
    typeof (value as Record<string, unknown>)['meta'] === 'object'
  );
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T | PaginatedResult<T>, ApiResponse<T>> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T | PaginatedResult<T>>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((value) => {
        if (isPaginatedResult<T>(value)) {
          return {
            success: true as const,
            data: value.data,
            meta: value.meta,
          };
        }
        return { success: true as const, data: value as T };
      }),
    );
  }
}
