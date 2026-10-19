import { Controller, Get } from '@nestjs/common';

/** Exigé par le socle technique : GET /health répond 200. Docker s'en sert pour savoir que l'API est prête. */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string; uptime: number } {
    return { status: 'ok', uptime: process.uptime() };
  }
}
