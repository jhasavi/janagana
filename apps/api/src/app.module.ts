import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Simple health controller
@Controller()
class SimpleHealthController {
  @Get()
  health() {
    return { status: 'ok', message: 'API is running' };
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok', message: 'API is running' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [SimpleHealthController],
})
export class AppModule {}
