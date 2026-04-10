import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

// Config
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { stripeConfig } from './config/stripe.config';
import { emailConfig } from './config/email.config';
import { jwtConfig } from './config/jwt.config';
import { cloudinaryConfig } from './config/cloudinary.config';

// Infrastructure
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './common/cache/cache.module';

// Middleware
import { TenantResolverMiddleware } from './common/middleware/tenant-resolver.middleware';

// Guards
import { RateLimiterGuard } from './security/rate-limiter';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { MembersModule } from './modules/members/members.module';
import { EventsModule } from './modules/events/events.module';
import { VolunteersModule } from './modules/volunteers/volunteers.module';
import { ClubsModule } from './modules/clubs/clubs.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SearchModule } from './modules/search/search.module';
import { UploadModule } from './modules/upload/upload.module';
import { WebhooksModule } from './webhooks/webhooks.module';

// Legacy controllers (kept for backwards compatibility during migration)
import { HealthController } from './modules/health/health.controller';
import { HealthService } from './modules/health/health.service';

@Module({
  imports: [
    // ── Configuration ────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, stripeConfig, emailConfig, jwtConfig, cloudinaryConfig],
      // .env is loaded automatically; no schema validation here to avoid
      // runtime dep on @nestjs/config validators — add joi/zod validation if needed.
    }),

    // ── Rate limiting ─────────────────────────────────────────────────────────
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    } as any),

    // ── Database (global) ─────────────────────────────────────────────────────
    DatabaseModule,
    CacheModule,

    // ── Feature modules ───────────────────────────────────────────────────────
    AuthModule,
    TenantsModule,
    UsersModule,
    MembersModule,
    EventsModule,
    VolunteersModule,
    ClubsModule,
    PaymentsModule,
    CommunicationsModule,
    AnalyticsModule,
    AuditModule,
    ReportsModule,
    SearchModule,
    UploadModule,
    WebhooksModule,
  ],
  controllers: [HealthController],
  providers: [
    RateLimiterGuard,
    HealthService,
    { provide: APP_GUARD, useClass: RateLimiterGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Tenant slug resolution runs on every request before guards
    consumer.apply(TenantResolverMiddleware).forRoutes('*');
  }
}
