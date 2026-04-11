import { Controller, Get } from '@nestjs/common';

@Controller('search')
export class SearchController {
  @Get()
  getSearch() {
    return { status: 'coming-soon' };
  }
}
