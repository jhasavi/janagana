import { Controller, Get } from '@nestjs/common';

@Controller('api-keys')
export class ApiKeysController {
  @Get()
  getApiKeys() {
    return { status: 'coming-soon' };
  }
}
