import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@liaots/nestjs-redis';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule,
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
      },
    }),
  ],
  controllers: [HealthController],
  providers: [],
  exports: [HealthController],
})
export class HealthModule {}
