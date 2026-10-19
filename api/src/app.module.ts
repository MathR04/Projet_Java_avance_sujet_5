import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { CompaniesModule } from './companies/companies.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

/** Le module racine : chaque fonctionnalité est un module importé ici. */
@Module({
  imports: [PrismaModule, AuthModule, BookingsModule, CompaniesModule, DashboardModule],
  controllers: [HealthController],
})
export class AppModule {}
