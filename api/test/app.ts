import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/auth/password.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

/**
 * L'application, comme main.ts la démarre, et de quoi créer des comptes.
 * Chaque test crée ses propres données, avec des noms uniques : les fichiers
 * de test partagent la même base sans se gêner.
 */
export async function startApp(): Promise<{ app: INestApplication; prisma: PrismaService; api: () => ReturnType<typeof request> }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  // Un vrai port : supertest réutilise le serveur au lieu d'en ouvrir et fermer
  // un à chaque requête, ce qui casse les requêtes imbriquées.
  await app.listen(0);
  return { app, prisma: app.get(PrismaService), api: () => request(app.getHttpServer()) };
}

export const unique = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;

export async function tokenFor(app: INestApplication, email: string, password: string): Promise<string> {
  const response = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200);
  return response.body.access_token as string;
}

/** Un compte de l'équipe, créé directement en base, comme le seed. */
export async function staffToken(app: INestApplication): Promise<string> {
  const email = `${unique('staff')}@forum.test`;
  await app.get(PrismaService).user.create({
    data: { email, name: 'Équipe', role: 'STAFF', passwordHash: hashPassword('password') },
  });
  return tokenFor(app, email, 'password');
}

/** Un élève, inscrit par la route publique, comme dans le front. */
export async function studentToken(app: INestApplication, year: 1 | 2 | 3 = 2): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email: `${unique('student')}@etu.test`, name: 'Élève', password: 'password', year })
    .expect(201);
  return response.body.access_token as string;
}

export interface CreatedCompany {
  id: string;
  name: string;
  slots: { id: string; startsAt: string; endsAt: string; capacity: number; booked: number }[];
}

export async function createCompany(app: INestApplication, staff: string, recruiterCount = 1): Promise<CreatedCompany> {
  const response = await request(app.getHttpServer())
    .post('/companies')
    .set('Authorization', `Bearer ${staff}`)
    .send({ name: unique('Entreprise'), recruiterCount })
    .expect(201);
  return response.body as CreatedCompany;
}

/** Un recruteur de cette entreprise, créé par l'équipe, et son token. */
export async function recruiterToken(app: INestApplication, staff: string, companyId: string): Promise<string> {
  const email = `${unique('recruiter')}@company.test`;
  const response = await request(app.getHttpServer())
    .post(`/companies/${companyId}/recruiters`)
    .set('Authorization', `Bearer ${staff}`)
    .send({ name: 'Recruteur', email })
    .expect(201);
  return tokenFor(app, email, response.body.password as string);
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
