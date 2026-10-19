import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator.js';
import { CompaniesService } from './companies.service.js';
import {
  CreateCompanyDto,
  CreateOfferDto,
  CreateRecruiterDto,
  UpdateCompanyDto,
  UpdateOfferDto,
} from './dto/company.dto.js';

/**
 * Les entreprises, leurs offres et leurs recruteurs.
 *
 * CHOIX : le catalogue se lit sans compte (GET). Le premier besoin de Léo est que
 * les élèves voient « avant le forum, quelles entreprises viennent et quels
 * stages elles proposent » (réponse 3) : un compte à créer d'abord freinerait.
 * Seule l'équipe écrit : elle saisit les offres à partir des mails (réponse 6).
 *
 * ParseUUIDPipe : un id mal formé donne 400, pas une requête inutile en base.
 */
@ApiTags('companies')
@Controller()
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get('companies')
  findAll() {
    return this.companies.findAll();
  }

  @Get('companies/:id')
  @ApiNotFoundResponse({ description: 'Unknown company' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.companies.findOne(id);
  }

  @Post('companies')
  @Auth('STAFF')
  @ApiConflictResponse({ description: 'Name already used' })
  create(@Body() dto: CreateCompanyDto) {
    return this.companies.create(dto);
  }

  @Patch('companies/:id')
  @Auth('STAFF')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCompanyDto) {
    return this.companies.update(id, dto);
  }

  @Delete('companies/:id')
  @HttpCode(204)
  @Auth('STAFF')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.companies.remove(id);
  }

  @Post('companies/:id/offers')
  @Auth('STAFF')
  addOffer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateOfferDto) {
    return this.companies.addOffer(id, dto);
  }

  @Patch('offers/:id')
  @Auth('STAFF')
  updateOffer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOfferDto) {
    return this.companies.updateOffer(id, dto);
  }

  @Delete('offers/:id')
  @HttpCode(204)
  @Auth('STAFF')
  removeOffer(@Param('id', ParseUUIDPipe) id: string) {
    return this.companies.removeOffer(id);
  }

  @Get('companies/:id/recruiters')
  @Auth('STAFF')
  recruiters(@Param('id', ParseUUIDPipe) id: string) {
    return this.companies.recruiters(id);
  }

  @Post('companies/:id/recruiters')
  @Auth('STAFF')
  @ApiConflictResponse({ description: 'Email already used' })
  addRecruiter(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateRecruiterDto) {
    return this.companies.addRecruiter(id, dto);
  }
}
