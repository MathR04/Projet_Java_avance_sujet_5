import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConflictResponse, ApiConsumes, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Auth } from '../auth/auth.decorator.js';
import type { JwtPayload } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { BookingsService } from './bookings.service.js';
import { MAX_CV_BYTES, CvService, type CvFile, type UploadedPdf } from './cv.service.js';
import { ScheduleService } from './schedule.service.js';

/** Le corps de POST /bookings : le créneau, et rien d'autre. L'élève vient du token. */
export class CreateBookingDto {
  @ApiProperty({ description: 'Le créneau à réserver' })
  @IsUUID()
  slotId!: string;
}

/**
 * Les routes de l'élève (rendez-vous, CV) et du recruteur (planning, CV d'un
 * rendez-vous). L'utilisateur vient toujours du token, jamais du corps de la
 * requête : un élève ne peut pas réserver au nom d'un autre.
 */
@ApiTags('bookings')
@Controller()
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly cv: CvService,
    private readonly schedule: ScheduleService,
  ) {}

  // ─── L'élève : ses rendez-vous ──────────────────────────────────────────

  @Post('bookings')
  @Auth('STUDENT')
  @ApiConflictResponse({ description: 'Créneau complet, passé, déjà réservé, ou maximum atteint' })
  book(@CurrentUser() user: JwtPayload, @Body() dto: CreateBookingDto) {
    return this.bookings.book(user.sub, dto.slotId);
  }

  @Get('me/bookings')
  @Auth('STUDENT')
  mine(@CurrentUser() user: JwtPayload) {
    return this.bookings.mine(user.sub);
  }

  @Delete('bookings/:id')
  @HttpCode(204)
  @Auth('STUDENT')
  cancel(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.cancel(user.sub, id);
  }

  // ─── L'élève : son CV ───────────────────────────────────────────────────

  @Put('me/cv')
  @Auth('STUDENT')
  @UseInterceptors(FileInterceptor('cv', { limits: { fileSize: MAX_CV_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { cv: { type: 'string', format: 'binary' } } } })
  uploadCv(@CurrentUser() user: JwtPayload, @UploadedFile() file?: UploadedPdf) {
    return this.cv.upload(user.sub, file);
  }

  @Get('me/cv')
  @Auth('STUDENT')
  cvInfo(@CurrentUser() user: JwtPayload) {
    return this.cv.info(user.sub);
  }

  @Get('me/cv/file')
  @Auth('STUDENT')
  async ownCv(@CurrentUser() user: JwtPayload) {
    return pdf(await this.cv.own(user.sub));
  }

  @Delete('me/cv')
  @HttpCode(204)
  @Auth('STUDENT')
  removeCv(@CurrentUser() user: JwtPayload) {
    return this.cv.remove(user.sub);
  }

  // ─── Le recruteur : son planning ────────────────────────────────────────

  @Get('recruiter/schedule')
  @Auth('RECRUITER')
  recruiterSchedule(@CurrentUser() user: JwtPayload) {
    return this.schedule.forCompany(user.companyId ?? '');
  }

  @Get('bookings/:id/cv')
  @Auth('RECRUITER')
  async bookingCv(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return pdf(await this.cv.forBooking(user, id));
  }
}

/** Renvoie le CV en PDF, à ouvrir dans le navigateur plutôt qu'à télécharger. */
function pdf({ filename, content }: CvFile): StreamableFile {
  return new StreamableFile(content, {
    type: 'application/pdf',
    disposition: `inline; filename="${filename}"`,
    length: content.length,
  });
}
