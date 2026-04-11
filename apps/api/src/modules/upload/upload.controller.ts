import { Controller, Get } from '@nestjs/common';

@Controller('upload')
export class UploadController {
  @Get()
  getUpload() {
    return { status: 'coming-soon' };
  }
}
