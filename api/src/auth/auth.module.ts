import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { RolesGuard } from './roles.guard.js';

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET is not set: cp .env.example .env');

/**
 * Signe et vérifie les tokens avec le secret de `.env`. `global: true` rend
 * JwtService injectable partout, donc `AuthGuard` marche dans tous les modules.
 *
 * CHOIX : un token valable 12 heures, sans refresh token. Un recruteur connecté
 * le matin à 8 h garde son planning ouvert jusqu'au soir sans se reconnecter.
 * C'est plus simple qu'un refresh token, au prix d'un token volé valable plus
 * longtemps : acceptable pour un forum d'une journée.
 */
@Module({
  imports: [JwtModule.register({ global: true, secret, signOptions: { expiresIn: '12h' } })],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard],
  exports: [AuthGuard, RolesGuard],
})
export class AuthModule {}
