import type { INestApplication } from '@nestjs/common';
import { bearer, createCompany, startApp, staffToken, studentToken, tokenFor, unique } from './app.js';

/**
 * Fonctionnalité 1 : le catalogue, public, et sa saisie par l'équipe seule.
 * Avec la génération des créneaux et la création des comptes recruteurs.
 */
describe('The catalogue and its management', () => {
  let app: INestApplication;
  let api: Awaited<ReturnType<typeof startApp>>['api'];
  let staff: string;

  beforeAll(async () => {
    ({ app, api } = await startApp());
    staff = await staffToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('a company comes with the slots of the day, 9 h to 17 h, 20 minutes each, one place per recruiter', async () => {
    const company = await createCompany(app, staff, 2);

    expect(company.slots).toHaveLength(24);
    expect(company.slots[0]).toMatchObject({ startsAt: '2099-11-19T08:00:00.000Z', capacity: 2, booked: 0 });
    expect(company.slots.at(-1)).toMatchObject({ endsAt: '2099-11-19T16:00:00.000Z' });
  });

  it('the catalogue is public: companies, offers and free places, without logging in', async () => {
    const company = await createCompany(app, staff);
    await api()
      .post(`/companies/${company.id}/offers`)
      .set(bearer(staff))
      .send({ title: 'Stage capteurs', duration: '6 mois', location: 'Aix' })
      .expect(201);

    const response = await api().get('/companies').expect(200);
    const listed = response.body.find((c: { id: string }) => c.id === company.id);

    expect(listed).toMatchObject({ name: company.name, totalPlaces: 24, freePlaces: 24 });
    expect(listed.offers).toEqual([expect.objectContaining({ title: 'Stage capteurs', duration: '6 mois' })]);
    expect(listed.slots).toBeUndefined();
  });

  it('only the staff writes: a student gets 403, a visitor 401', async () => {
    const student = await studentToken(app);
    await api().post('/companies').set(bearer(student)).send({ name: unique('Nope') }).expect(403);
    await api().post('/companies').send({ name: unique('Nope') }).expect(401);
  });

  it('two companies cannot share a name', async () => {
    const name = unique('Twin');
    await api().post('/companies').set(bearer(staff)).send({ name }).expect(201);
    await api().post('/companies').set(bearer(staff)).send({ name }).expect(409);
  });

  it('a second recruiter on the stand doubles the places of every slot', async () => {
    const company = await createCompany(app, staff, 1);

    const response = await api().patch(`/companies/${company.id}`).set(bearer(staff)).send({ recruiterCount: 2 }).expect(200);

    expect(response.body.totalPlaces).toBe(48);
    expect(response.body.slots.every((slot: { capacity: number }) => slot.capacity === 2)).toBe(true);
  });

  it('the staff edits and deletes an offer', async () => {
    const company = await createCompany(app, staff);
    const offer = await api()
      .post(`/companies/${company.id}/offers`)
      .set(bearer(staff))
      .send({ title: 'Brouillon', duration: '2 mois' })
      .expect(201);

    await api().patch(`/offers/${offer.body.id}`).set(bearer(staff)).send({ title: 'Stage final' }).expect(200);
    const detail = await api().get(`/companies/${company.id}`).expect(200);
    expect(detail.body.offers[0].title).toBe('Stage final');

    await api().delete(`/offers/${offer.body.id}`).set(bearer(staff)).expect(204);
    const after = await api().get(`/companies/${company.id}`).expect(200);
    expect(after.body.offers).toEqual([]);
  });

  it('the staff creates a recruiter account; its password is given once, and works', async () => {
    const company = await createCompany(app, staff);
    const email = `${unique('sophie')}@company.test`;

    const created = await api()
      .post(`/companies/${company.id}/recruiters`)
      .set(bearer(staff))
      .send({ name: 'Sophie', email })
      .expect(201);
    expect(typeof created.body.password).toBe('string');

    const token = await tokenFor(app, email, created.body.password);
    const whoami = await api().get('/auth/whoami').set(bearer(token)).expect(200);
    expect(whoami.body).toMatchObject({ role: 'RECRUITER', companyId: company.id });

    const list = await api().get(`/companies/${company.id}/recruiters`).set(bearer(staff)).expect(200);
    expect(list.body).toEqual([{ id: created.body.id, email, name: 'Sophie' }]);
  });

  it('an unknown company: 404', async () => {
    await api().get('/companies/00000000-0000-4000-8000-000000000000').expect(404);
  });
});
