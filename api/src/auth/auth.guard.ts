import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Role } from './roles.js';

/**
 * Ce que porte le token. `sub` est l'id de l'utilisateur : c'est la convention JWT.
 * `year` et `companyId` évitent une lecture en base à chaque requête : le
 * planning d'un recruteur se trouve directement par son `companyId`.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  /** Élèves : 1, 2 ou 3 */
  year?: number | null;
  /** Recruteurs : leur entreprise */
  companyId?: string | null;
}

/** La requête, une fois le guard passé : `user` vient du token. */
export interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: JwtPayload;
}

/**
 * Repris du TP4. Lit le Bearer token, le vérifie, et attache son contenu à la requête.
 * Pas de token, ou un mauvais : 401, et le handler ne s'exécute pas.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    try {
      request.user = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }
}

function extractBearerToken(header: string | undefined): string | undefined {
  const [scheme, token] = header?.split(' ') ?? [];
  return scheme === 'Bearer' ? token : undefined;
}
