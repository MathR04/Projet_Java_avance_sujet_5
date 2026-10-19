import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { CvService } from './cv.service.js';
import { ScheduleService } from './schedule.service.js';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, CvService, ScheduleService],
})
export class BookingsModule {}
