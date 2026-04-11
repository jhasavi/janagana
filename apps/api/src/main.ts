import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import express from 'express';
import * as Sentry from '@sentry/node';
import { BrowserTracing } from '@sentry/tracing';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { sanitizeRequest } from './security/input-sanitizer';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  logger.log('🚀 Starting OrgFlow API...');
  logger.log('📦 Loading modules in tiered order...');
  
  try {
    const app = await NestFactory.create(AppModule, {
      // Disable NestJS built-in logger in production — use our structured logger instead
      bufferLogs: true,
    });

    const configService = app.get(ConfigService);

  // ── Security headers ─────────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ─────────────────────────────────────────────────────────────────────
  const webOrigins = configService.get<string[]>('app.webOrigins') ?? [
    'http://localhost:3000',
  ];
  app.enableCors({
    origin: webOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-slug'],
  });

  // ── Input sanitization ────────────────────────────────────────────────────────
  app.use(sanitizeRequest);

  // ── Sentry error tracking ──────────────────────────────────────────────────────
  const sentryDsn = configService.get<string>('sentry.dsn');
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: configService.get<string>('app.nodeEnv') ?? process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      integrations: [new BrowserTracing()],
    });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  // ── Global prefix & versioning ───────────────────────────────────────────────
  // Route pattern: /api/v1/<resource>
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ── Global validation ─────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
      stopAtFirstError: false,
    }),
  );

  // ── Global filters (order matters: Prisma first, then Http) ──────────────────
  app.useGlobalFilters(new PrismaExceptionFilter(), new HttpExceptionFilter());

  // ── Webhook raw body parser ──────────────────────────────────────────────────
  app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }));

  // ── Global interceptors ───────────────────────────────────────────────────────
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());

  // ── Swagger documentation ─────────────────────────────────────────────────────
  const isProduction = configService.get<boolean>('app.isProduction') ?? false;
  if (!isProduction) {
    const swaggerCfg = new DocumentBuilder()
      .setTitle('OrgFlow API')
      .setDescription(
        'OrgFlow platform — membership, events, volunteers, clubs, payments.',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'Clerk JWT',
      )
      .addGlobalParameters({
        in: 'header',
        name: 'x-tenant-slug',
        required: false,
        schema: { type: 'string', example: 'acme' },
        description: 'Tenant slug (alternative to subdomain resolution)',
      })
      .build();

    const document = SwaggerModule.createDocument(app, swaggerCfg);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    logger.log('Swagger docs available at /api/docs');
  }

  // ── Start ─────────────────────────────────────────────────────────────────────
  const port = configService.get<number>('app.port') ?? 4000;
  await app.listen(port);
  logger.log(`✅ OrgFlow API listening on port ${port}`);
  logger.log('📊 Module health check available at /api/v1/health/modules');
  } catch (error) {
    logger.error('❌ Failed to start API', error);
    process.exit(1);
  }
}

void bootstrap();
