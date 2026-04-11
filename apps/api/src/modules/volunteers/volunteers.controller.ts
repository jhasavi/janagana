import { Controller, Get } from '@nestjs/common';

@Controller('volunteers')
export class VolunteersController {
  @Get()
  getVolunteers() {
    return { status: 'coming-soon' };
  }
}
