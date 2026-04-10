import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL ?? '',
  directUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  poolMin: parseInt(process.env.DB_POOL_MIN ?? '2', 10),
  poolMax: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
  logQueries: process.env.DB_LOG_QUERIES === 'true',
}));

export type DatabaseConfig = ReturnType<typeof databaseConfig>;
