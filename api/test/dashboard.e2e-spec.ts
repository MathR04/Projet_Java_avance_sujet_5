import type { INestApplication } from '@nestjs/common';
import { bearer, createCompany, startApp, staffToken, studentToken } from './app.js';

/**
 * Fonctionnalité 3, côté équipe : le tableau de bord des stands, et
 * l'ouverture des réservations aux 1A.
 */
describe('The dashboard of the staff', () => {
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

  it('the dashboard is for the staff, and puts the emptiest stands first', async () => {
    const busy = await createCompany(app, staff);
    await api().post('/bookings').set(bearer(await studentToken(app))).send({ slotId: busy.slots[0].id }).expect(201);
    await api().post('/bookings').set(bearer(await studentToken(app))).send({ slotId: busy.slots[1].id }).expect(201);

    await api().get('/dashboard').set(bearer(await studentToken(app))).expect(403);
    const dashboard = await api().get('/dashboard').set(bearer(staff)).expect(200);

    const busyStand = dashboard.body.stands.find((stand: { id: string }) => stand.id === busy.id);
    expect(busyStand).toMatchObject({ booked: 2, morningBooked: 2, totalPlaces: 24 });
    const rates = dashboard.body.stands.map((stand: { fillRate: number }) => stand.fillRate);
    expect(rates).toEqual([...rates].sort((a, b) => a - b));
    expect(dashboard.body.totals.emptyMorningStands).toBeGreaterThan(0);
  });

  it('the staff opens the bookings to the 1A, and anyone can read whether they are open', async () => {
    await api().patch('/settings').set(bearer(await studentToken(app))).send({ openToFirstYears: true }).expect(403);

    await api().patch('/settings').set(bearer(staff)).send({ openToFirstYears: true }).expect(200);
    const settings = await api().get('/settings').expect(200);
    expect(settings.body).toMatchObject({ openToFirstYears: true, forum: { date: '2099-11-19', slotMinutes: 20 } });

    await api().patch('/settings').set(bearer(staff)).send({ openToFirstYears: false }).expect(200);
  });
});
