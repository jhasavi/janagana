import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly configService: ConfigService) {
    const logQueries = configService.get<boolean>('database.logQueries') ?? false;

    const log: Prisma.LogDefinition[] = logQueries
      ? [
          { level: 'query', emit: 'event' },
          { level: 'warn', emit: 'stdout' },
          { level: 'error', emit: 'stdout' },
        ]
      : [
          { level: 'warn', emit: 'stdout' },
          { level: 'error', emit: 'stdout' },
        ];

    super({ log });

    if (logQueries) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).$on('query', (event: Prisma.QueryEvent) => {
        this.logger.debug(`Query: ${event.query} — ${event.duration}ms`);
      });
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection established.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed.');
  }
}
