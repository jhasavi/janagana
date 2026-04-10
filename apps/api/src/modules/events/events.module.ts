import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventCategoriesService } from './event-categories.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, EventCategoriesService],
  exports: [EventsService, EventCategoriesService],
})
export class EventsModule {}
