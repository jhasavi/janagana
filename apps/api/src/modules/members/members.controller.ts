import { Controller, Get } from '@nestjs/common';

@Controller('members')
export class MembersController {
  @Get()
  getMembers() {
    return { status: 'coming-soon' };
  }
}
