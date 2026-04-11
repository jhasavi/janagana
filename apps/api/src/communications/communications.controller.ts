import { Controller, Get } from '@nestjs/common';

@Controller('communications')
export class CommunicationsController {
  @Get()
  getCommunications() {
    return { status: 'coming-soon' };
  }
}
