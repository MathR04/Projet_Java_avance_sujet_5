import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Auth } from './auth.decorator.js';
import type { JwtPayload } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { AccessTokenDto } from './dto/access-token.dto.js';
import { JwtPayloadDto } from './dto/jwt-payload.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

/**
 *   POST /auth/login     { email, password }              →  { access_token }, ou 401
 *   POST /auth/register  { email, name, password, year }  →  { access_token }, un compte élève
 *   GET  /auth/whoami    avec un Bearer token             →  le contenu du token, ou 401
 */
// CHOIX : on se connecte avec son e-mail plutôt qu'un identifiant : c'est ce
// que l'équipe connaît des recruteurs, qui lui écrivent par mail.
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: AccessTokenDto })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiUnauthorizedResponse({ description: 'Wrong email or password' })
  async login(@Body() dto: LoginDto): Promise<AccessTokenDto> {
    return { access_token: await this.auth.login(dto.email, dto.password) };
  }

  @Post('register')
  @ApiCreatedResponse({ type: AccessTokenDto })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiConflictResponse({ description: 'Email already used' })
  async register(@Body() dto: RegisterDto): Promise<AccessTokenDto> {
    return { access_token: await this.auth.register(dto) };
  }

  @Get('whoami')
  @Auth()
  @ApiOkResponse({ type: JwtPayloadDto })
  whoami(@CurrentUser() user: JwtPayload): JwtPayload {
    return user;
  }
}
