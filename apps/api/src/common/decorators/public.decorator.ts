import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a controller or individual route handler as public so that JwtAuthGuard
 * skips authentication entirely.
 *
 * @example
 * @Public()
 * @Get('health')
 * health() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
