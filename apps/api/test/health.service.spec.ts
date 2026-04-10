import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../src/modules/health/health.service';
import { DatabaseService } from '../src/database/database.service';
import { CacheService } from '../src/common/cache/cache.service';

describe('HealthService', () => {
  let service: HealthService;
  let db: Partial<DatabaseService>;
  let cache: Partial<CacheService>;

  beforeEach(async () => {
    db = { $queryRaw: jest.fn().mockResolvedValue([1]) } as any;
    cache = { health: jest.fn().mockResolvedValue(true) } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: DatabaseService, useValue: db },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should report db and redis OK', async () => {
    const [dbStatus, redisStatus] = await Promise.all([
      service.checkDb(),
      service.checkRedis(),
    ]);

    expect(dbStatus).toBe('ok');
    expect(redisStatus).toBe('ok');
  });
});
