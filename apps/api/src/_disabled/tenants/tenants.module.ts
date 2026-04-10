import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { SettingsController } from './settings.controller';
import { TenantsService } from './tenants.service';

@Module({
  controllers: [TenantsController, SettingsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
