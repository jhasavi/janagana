import { Controller, Get } from '@nestjs/common';

@Controller('notifications')
export class NotificationsController {
  @Get()
  getNotifications() {
    return { status: 'coming-soon' };
  }
}
