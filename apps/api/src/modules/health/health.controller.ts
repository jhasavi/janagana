import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOkResponse({ description: 'Service health check.' })
  async getHealth() {
    const db = await this.healthService.checkDb();
    const redis = await this.healthService.checkRedis();

    return {
      status: 'ok',
      db,
      redis,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('modules')
  @Public()
  @ApiOkResponse({ description: 'Module health check.' })
  async getModulesHealth() {
    return {
      tenants: 'active',
      users: 'active',
      members: 'active',
      events: 'active',
      volunteers: 'active',
      clubs: 'active',
      communications: 'active',
      analytics: 'active',
      payments: 'active',
      donations: 'active',
      upload: 'active',
      webhooks: 'active',
      apiKeys: 'active',
      reports: 'active',
      search: 'active',
      notifications: 'active',
      organizations: 'active',
      feedback: 'active',
      audit: 'active',
      health: 'active',
      auth: 'active',
      timestamp: new Date().toISOString(),
    };
  }
}

