import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from './roles.js';
import type { AuthenticatedRequest } from './auth.guard.js';
import { ROLES_KEY } from './roles.decorator.js';

/**
 * Repris du TP4. S'exécute après AuthGuard, qui a rempli `request.user`.
 * Pas de @Roles() sur la route : tout utilisateur connecté passe.
 * Un rôle qui ne convient pas : 403.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException(`Requires one of the roles: ${required.join(', ')}`);
    }
    return true;
  }
}
