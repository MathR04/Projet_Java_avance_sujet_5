import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

/** Le module racine : chaque fonctionnalité est un module importé ici. */
@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
