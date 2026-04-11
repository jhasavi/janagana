import { Controller, Get } from '@nestjs/common';

@Controller('tenants')
export class TenantsController {
  @Get()
  getTenants() {
    return { status: 'coming-soon' };
  }
}
