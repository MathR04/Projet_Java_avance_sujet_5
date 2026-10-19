import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

/** Le module racine : chaque fonctionnalité est un module importé ici. */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
