import type { INestApplication } from '@nestjs/common';
import { bearer, startApp, unique } from './app.js';

/**
 * La connexion, l'inscription des élèves, et GET /health exigé par le socle.
 * L'essentiel : personne ne s'inscrit avec un autre rôle qu'élève.
 */
describe('Authentication', () => {
  let app: INestApplication;
  let api: Awaited<ReturnType<typeof startApp>>['api'];

  beforeAll(async () => {
    ({ app, api } = await startApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health answers 200', async () => {
    const response = await api().get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });

  it('a student registers, then logs in, and the token says STUDENT with the year', async () => {
    const email = `${unique('camille')}@etu.test`;
    await api().post('/auth/register').send({ email, name: 'Camille', password: 'password', year: 3 }).expect(201);

    const login = await api().post('/auth/login').send({ email, password: 'password' }).expect(200);
    const whoami = await api().get('/auth/whoami').set(bearer(login.body.access_token)).expect(200);

    expect(whoami.body).toMatchObject({ email, name: 'Camille', role: 'STUDENT', year: 3 });
  });

  it('the email is case-insensitive', async () => {
    const email = `${unique('Case')}@Etu.test`;
    await api().post('/auth/register').send({ email, name: 'Case', password: 'password', year: 2 }).expect(201);
    await api().post('/auth/login').send({ email: email.toUpperCase(), password: 'password' }).expect(200);
  });

  it('nobody registers as staff: an extra `role` field is refused', async () => {
    await api()
      .post('/auth/register')
      .send({ email: `${unique('sneaky')}@etu.test`, name: 'Sneaky', password: 'password', year: 2, role: 'STAFF' })
      .expect(400);
  });

  it('refuses a second account with the same email', async () => {
    const body = { email: `${unique('twice')}@etu.test`, name: 'Twice', password: 'password', year: 2 };
    await api().post('/auth/register').send(body).expect(201);
    await api().post('/auth/register').send(body).expect(409);
  });

  it('refuses a year that is not 1, 2 or 3, and a short password', async () => {
    await api().post('/auth/register').send({ email: `${unique('y')}@etu.test`, name: 'Y', password: 'password', year: 4 }).expect(400);
    await api().post('/auth/register').send({ email: `${unique('p')}@etu.test`, name: 'P', password: 'short', year: 2 }).expect(400);
  });

  it('answers 401 for a wrong password, and without a token', async () => {
    const email = `${unique('wrong')}@etu.test`;
    await api().post('/auth/register').send({ email, name: 'W', password: 'password', year: 2 }).expect(201);
    await api().post('/auth/login').send({ email, password: 'nope-nope' }).expect(401);
    await api().get('/auth/whoami').expect(401);
  });
});
