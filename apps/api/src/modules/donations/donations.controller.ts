import { Controller, Get } from '@nestjs/common';

@Controller('donations')
export class DonationsController {
  @Get()
  getDonations() {
    return { status: 'coming-soon' };
  }
}
