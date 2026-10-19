import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthGuard } from './auth.guard.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
import type { Role } from './roles.js';

/**
 * Une route protégée : un token valide, et l'un des rôles donnés.
 * Sans rôle : tout utilisateur connecté passe.
 *
 *   @Auth('STAFF')   seule l'équipe
 *   @Auth()          n'importe qui de connecté
 *
 * Regroupe les deux guards, AuthGuard (le token) puis RolesGuard (le rôle),
 * et la documentation Swagger, pour ne pas les répéter sur chaque route.
 */
export function Auth(...roles: Role[]) {
  return applyDecorators(
    UseGuards(AuthGuard, RolesGuard),
    Roles(...roles),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Missing or invalid token' }),
    ApiForbiddenResponse({ description: `Requires one of the roles: ${roles.join(', ') || 'any'}` }),
  );
}
