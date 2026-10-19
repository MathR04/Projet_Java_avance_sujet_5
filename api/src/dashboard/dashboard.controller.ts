import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { Auth } from '../auth/auth.decorator.js';
import { forumConfig } from '../forum.config.js';
import { DashboardService } from './dashboard.service.js';

/** Le corps de PATCH /settings. */
export class UpdateSettingsDto {
  @ApiProperty({ description: 'Ouvrir les réservations aux 1A' })
  @IsBoolean()
  openToFirstYears!: boolean;
}

/** Le tableau de bord de l'équipe, et les réglages du forum. */
@ApiTags('dashboard')
@Controller()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('dashboard')
  @Auth('STAFF')
  overview() {
    return this.dashboard.overview();
  }

  /** Public : le front dit à un 1A si les réservations lui sont ouvertes, et quand a lieu le forum. */
  @Get('settings')
  async settings() {
    const { openToFirstYears } = await this.dashboard.settings();
    const { date, opensAt, closesAt, slotMinutes, maxBookingsPerStudent } = forumConfig();
    return { openToFirstYears, forum: { date, opensAt, closesAt, slotMinutes, maxBookingsPerStudent } };
  }

  @Patch('settings')
  @Auth('STAFF')
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.dashboard.updateSettings(dto.openToFirstYears);
  }
}
