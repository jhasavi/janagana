import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  apiVersion: process.env.API_VERSION ?? 'v1',
  webOrigins: (process.env.WEB_ORIGINS ?? 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((o) => o.trim()),
  appDomain: process.env.APP_DOMAIN ?? 'namasteneedham.com',
  webUrl: process.env.APP_WEB_URL ?? 'http://localhost:3000',
  isProduction: (process.env.NODE_ENV ?? '') === 'production',
}));

export type AppConfig = ReturnType<typeof appConfig>;
