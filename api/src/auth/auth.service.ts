import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './auth.guard.js';
import type { RegisterDto } from './dto/register.dto.js';
import { hashPassword, verifyPassword } from './password.js';
import type { Role } from './roles.js';

/**
 * La connexion et l'inscription. Dans les deux cas, la réponse est un JWT signé
 * qui porte qui est connecté : son id, son rôle, et selon le rôle son année
 * (élève) ou son entreprise (recruteur).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<string> {
    // CHOIX : l'e-mail est comparé en minuscules : « Camille@… » et
    // « camille@… » sont le même compte.
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Un seul message pour « compte inconnu » et « mauvais mot de passe » : on ne
    // dit pas à un inconnu quels e-mails ont un compte.
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Wrong email or password');
    }
    return this.sign(user);
  }

  /**
   * L'inscription, qui connecte aussitôt.
   *
   * CHOIX : seuls les élèves s'inscrivent eux-mêmes. Le rôle est fixé ici, et
   * jamais lu dans la requête : personne ne s'inscrit comme équipe. Les
   * recruteurs ont leur compte créé par l'équipe (réponse 6 de Léo :
   * « Les recruteurs n'ont pas le temps de se créer un compte »).
   *
   * CHOIX : n'importe quel e-mail est accepté, pas seulement ceux de l'école :
   * Léo n'a pas parlé de restreindre, et les élèves en échange n'ont pas
   * toujours d'adresse de l'école. À lui demander.
   */
  async register(dto: RegisterDto): Promise<string> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('An account already exists for this email');

    const user = await this.prisma.user.create({
      data: { email, name: dto.name, year: dto.year, role: 'STUDENT', passwordHash: hashPassword(dto.password) },
    });
    return this.sign(user);
  }

  /** Le contenu du token. Il n'est pas chiffré, seulement signé : rien de secret dedans. */
  private sign(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      year: user.year,
      companyId: user.companyId,
    };
    return this.jwt.signAsync(payload);
  }
}
