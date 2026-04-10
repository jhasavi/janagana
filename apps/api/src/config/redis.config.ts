import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD,
  ttlSeconds: parseInt(process.env.REDIS_TTL_SECONDS ?? '3600', 10),
}));

export type RedisConfig = ReturnType<typeof redisConfig>;
