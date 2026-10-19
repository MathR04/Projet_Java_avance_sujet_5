import type { INestApplication } from '@nestjs/common';
import { bearer, createCompany, recruiterToken, startApp, staffToken, studentToken, type CreatedCompany } from './app.js';

/**
 * Fonctionnalité 2 : une règle de BookingsService par test, au moins.
 * MAX_BOOKINGS_PER_STUDENT vaut 3 dans les tests (vitest.config.ts).
 */
describe('Booking a slot', () => {
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

  const book = (token: string, slotId: string) => api().post('/bookings').set(bearer(token)).send({ slotId });

  it('a 2A books a slot, and finds it in their bookings', async () => {
    const company = await createCompany(app, staff);
    const student = await studentToken(app, 2);

    await book(student, company.slots[0].id).expect(201);

    const mine = await api().get('/me/bookings').set(bearer(student)).expect(200);
    expect(mine.body).toEqual([
      expect.objectContaining({ slot: expect.objectContaining({ id: company.slots[0].id, company: expect.objectContaining({ name: company.name }) }) }),
    ]);
    const detail = await api().get(`/companies/${company.id}`).expect(200);
    expect(detail.body.slots[0].booked).toBe(1);
    expect(detail.body.freePlaces).toBe(23);
  });

  it('a 1A waits until the staff opens the bookings to them', async () => {
    const company = await createCompany(app, staff);
    const firstYear = await studentToken(app, 1);

    const refused = await book(firstYear, company.slots[0].id).expect(403);
    expect(refused.body.message).toContain('1A');

    await api().patch('/settings').set(bearer(staff)).send({ openToFirstYears: true }).expect(200);
    await book(firstYear, company.slots[0].id).expect(201);
    await api().patch('/settings').set(bearer(staff)).send({ openToFirstYears: false }).expect(200);
  });

  it('a slot takes as many students as there are recruiters', async () => {
    const company = await createCompany(app, staff, 1);
    await book(await studentToken(app), company.slots[0].id).expect(201);

    const full = await book(await studentToken(app), company.slots[0].id).expect(409);
    expect(full.body.message).toBe('Ce créneau est complet');
  });

  it('with two recruiters, two students share a slot', async () => {
    const company = await createCompany(app, staff, 2);
    await book(await studentToken(app), company.slots[0].id).expect(201);
    await book(await studentToken(app), company.slots[0].id).expect(201);
    await book(await studentToken(app), company.slots[0].id).expect(409);
  });

  it('one booking per company: a second slot at the same stand is refused', async () => {
    const company = await createCompany(app, staff);
    const student = await studentToken(app);
    await book(student, company.slots[0].id).expect(201);

    const twice = await book(student, company.slots[1].id).expect(409);
    expect(twice.body.message).toContain('déjà un rendez-vous avec');
  });

  it('never two bookings at the same time, at two stands', async () => {
    const a = await createCompany(app, staff);
    const b = await createCompany(app, staff);
    const student = await studentToken(app);
    await book(student, a.slots[3].id).expect(201);

    const overlap = await book(student, b.slots[3].id).expect(409);
    expect(overlap.body.message).toBe('Vous avez déjà un rendez-vous à cette heure-là');
    await book(student, b.slots[4].id).expect(201);
  });

  it('at most MAX_BOOKINGS_PER_STUDENT bookings, 3 in the tests', async () => {
    const companies: CreatedCompany[] = [];
    for (let i = 0; i < 4; i++) companies.push(await createCompany(app, staff));
    const student = await studentToken(app);

    for (let i = 0; i < 3; i++) await book(student, companies[i].slots[i].id).expect(201);
    const fourth = await book(student, companies[3].slots[3].id).expect(409);
    expect(fourth.body.message).toContain('le maximum');
  });

  it('a student cancels their booking, and the place is free again', async () => {
    const company = await createCompany(app, staff);
    const student = await studentToken(app);
    const booking = await book(student, company.slots[0].id).expect(201);

    await api().delete(`/bookings/${booking.body.id}`).set(bearer(student)).expect(204);

    const detail = await api().get(`/companies/${company.id}`).expect(200);
    expect(detail.body.slots[0].booked).toBe(0);
    await book(await studentToken(app), company.slots[0].id).expect(201);
  });

  it('nobody cancels the booking of another student: 404', async () => {
    const company = await createCompany(app, staff);
    const booking = await book(await studentToken(app), company.slots[0].id).expect(201);

    await api().delete(`/bookings/${booking.body.id}`).set(bearer(await studentToken(app))).expect(404);
  });

  it('only students book: a recruiter or the staff gets 403', async () => {
    const company = await createCompany(app, staff);
    await book(staff, company.slots[0].id).expect(403);
    await book(await recruiterToken(app, staff, company.id), company.slots[0].id).expect(403);
  });

  it('an unknown slot: 404, a malformed one: 400', async () => {
    const student = await studentToken(app);
    await book(student, '00000000-0000-4000-8000-000000000000').expect(404);
    await book(student, 'not-a-uuid').expect(400);
  });
});
