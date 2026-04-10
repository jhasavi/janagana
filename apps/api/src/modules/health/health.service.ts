import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CacheService } from '../../common/cache/cache.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cacheService: CacheService,
  ) {}

  async checkDb() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'fail';
    }
  }

  async checkRedis() {
    const healthy = await this.cacheService.health();
    return healthy ? 'ok' : 'fail';
  }
}
