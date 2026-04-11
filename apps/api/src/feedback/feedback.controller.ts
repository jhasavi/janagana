import { Controller, Get } from '@nestjs/common';

@Controller('feedback')
export class FeedbackController {
  @Get()
  getFeedback() {
    return { status: 'coming-soon' };
  }
}
