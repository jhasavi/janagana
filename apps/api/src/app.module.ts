import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './config/validation';

// TIER 1 - ALWAYS LOAD (Core Infrastructure)
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './common/cache/cache.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';

// TIER 2 - MAIN FEATURES
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { MembersModule } from './modules/members/members.module';
import { EventsModule } from './modules/events/events.module';

// TIER 3 - EXTENDED FEATURES
import { VolunteersModule } from './modules/volunteers/volunteers.module';
import { ClubsModule } from './modules/clubs/clubs.module';
import { CommunicationsModule } from './communications/communications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

// TIER 4 - PAYMENT & INTEGRATIONS
import { PaymentsModule } from './modules/payments/payments.module';
import { DonationsModule } from './modules/donations/donations.module';
import { UploadModule } from './modules/upload/upload.module';

// TIER 5 - PLATFORM
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

// Additional modules
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    // TIER 1 - Core Infrastructure (Always Load)
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    DatabaseModule,
    CacheModule,
    HealthModule,
    AuthModule,

    // TIER 2 - Main Features
    TenantsModule,
    UsersModule,
    MembersModule,
    EventsModule,

    // TIER 3 - Extended Features
    VolunteersModule,
    ClubsModule,
    CommunicationsModule,
    AnalyticsModule,

    // TIER 4 - Payment & Integrations
    PaymentsModule,
    DonationsModule,
    UploadModule,

    // TIER 5 - Platform
    WebhooksModule,
    ApiKeysModule,
    ReportsModule,
    SearchModule,
    NotificationsModule,

    // Additional modules
    OrganizationsModule,
    FeedbackModule,
    AuditModule,
  ],
})
export class AppModule {}
