import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { RedisHealthIndicator } from '@nestjs/terminus';
import { InjectRedis } from '@liaots/nestjs-redis';
import Redis from 'ioredis';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
    @InjectRedis() private redisClient: Redis,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({ status: 200, description: 'Server is running' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check' })
  @ApiResponse({ status: 200, description: 'All dependencies are healthy' })
  @ApiResponse({ status: 503, description: 'One or more dependencies are unhealthy' })
  async readiness() {
    const startTime = Date.now();
    
    const result = await this.health.check([
      async () => {
        const dbStart = Date.now();
        try {
          const isHealthy = await this.db.pingCheck('database');
          const latency = Date.now() - dbStart;
          return {
            database: {
              status: isHealthy.status === 'up' ? 'up' : 'down',
              latency: `${latency}ms`,
            },
          };
        } catch (error) {
          return {
            database: {
              status: 'down',
              latency: `${Date.now() - dbStart}ms`,
              error: error.message,
            },
          };
        }
      },
      async () => {
        const redisStart = Date.now();
        try {
          const isHealthy = await this.redis.pingCheck('redis');
          const latency = Date.now() - redisStart;
          return {
            redis: {
              status: isHealthy.status === 'up' ? 'up' : 'down',
              latency: `${latency}ms`,
            },
          };
        } catch (error) {
          return {
            redis: {
              status: 'down',
              latency: `${Date.now() - redisStart}ms`,
              error: error.message,
            },
          };
        }
      },
      async () => {
        const stripeStart = Date.now();
        try {
          // Simple Stripe health check
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
          await stripe.accounts.retrieve();
          const latency = Date.now() - stripeStart;
          return {
            stripe: {
              status: 'up',
              latency: `${latency}ms`,
            },
          };
        } catch (error) {
          return {
            stripe: {
              status: 'down',
              latency: `${Date.now() - stripeStart}ms`,
              error: error.message,
            },
          };
        }
      },
      async () => {
        const resendStart = Date.now();
        try {
          // Simple Resend health check
          const Resend = require('resend').Resend;
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.domains.list({ limit: 1 });
          const latency = Date.now() - resendStart;
          return {
            resend: {
              status: 'up',
              latency: `${latency}ms`,
            },
          };
        } catch (error) {
          return {
            resend: {
              status: 'down',
              latency: `${Date.now() - resendStart}ms`,
              error: error.message,
            },
          };
        }
      },
    ]);

    const uptime = process.uptime();
    const version = require('../../../package.json').version;

    return {
      status: Object.values(result).every((check: any) => check.status === 'up') ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      uptime_formatted: formatUptime(uptime),
      version,
      checks: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      uptime_formatted: formatUptime(process.uptime()),
      version: require('../../../package.json').version,
    };
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}
