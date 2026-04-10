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
}

