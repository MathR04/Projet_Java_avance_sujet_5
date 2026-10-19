import type { INestApplication } from '@nestjs/common';
import { bearer, createCompany, recruiterToken, startApp, staffToken, studentToken } from './app.js';

/**
 * Fonctionnalité 3, côté recruteur : le planning de son stand, et les CV des
 * seuls élèves qui l'ont réservé.
 */

/** Le plus petit fichier qui passe pour un PDF : il commence par « %PDF ». */
const PDF = Buffer.from('%PDF-1.4\n% un CV de test\n%%EOF\n');

describe('The day of the forum: the recruiter and the CV', () => {
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

  const uploadCv = (token: string, content: Buffer, filename = 'cv.pdf', contentType = 'application/pdf') =>
    api().put('/me/cv').set(bearer(token)).attach('cv', content, { filename, contentType });

  it('the recruiter sees who comes, and when, on their own stand only', async () => {
    const company = await createCompany(app, staff);
    const other = await createCompany(app, staff);
    const student = await studentToken(app, 3);
    await api().post('/bookings').set(bearer(student)).send({ slotId: company.slots[2].id }).expect(201);
    await api().post('/bookings').set(bearer(await studentToken(app))).send({ slotId: other.slots[2].id }).expect(201);

    const recruiter = await recruiterToken(app, staff, company.id);
    const schedule = await api().get('/recruiter/schedule').set(bearer(recruiter)).expect(200);

    expect(schedule.body.name).toBe(company.name);
    const booked = schedule.body.slots.filter((slot: { bookings: unknown[] }) => slot.bookings.length > 0);
    expect(booked).toHaveLength(1);
    expect(booked[0].bookings[0].student).toMatchObject({ name: 'Élève', year: 3, hasCv: false });
  });

  it('a student uploads a PDF CV; a text file pretending to be one is refused', async () => {
    const student = await studentToken(app);

    await uploadCv(student, PDF, 'Mon CV.pdf').expect(200);
    const info = await api().get('/me/cv').set(bearer(student)).expect(200);
    expect(info.body.filename).toBe('Mon CV.pdf');

    await uploadCv(student, Buffer.from('not a pdf'), 'cv.pdf').expect(400);
  });

  it('the recruiter reads the CV of a student who booked their stand, and no other recruiter can', async () => {
    const company = await createCompany(app, staff);
    const other = await createCompany(app, staff);
    const student = await studentToken(app);
    await uploadCv(student, PDF).expect(200);
    const booking = await api().post('/bookings').set(bearer(student)).send({ slotId: company.slots[0].id }).expect(201);

    const ours = await recruiterToken(app, staff, company.id);
    const theirs = await recruiterToken(app, staff, other.id);

    const cv = await api().get(`/bookings/${booking.body.id}/cv`).set(bearer(ours)).buffer(true).expect(200);
    expect(cv.headers['content-type']).toBe('application/pdf');
    expect(Buffer.from(cv.body).subarray(0, 4).toString()).toBe('%PDF');

    await api().get(`/bookings/${booking.body.id}/cv`).set(bearer(theirs)).expect(403);
    await api().get(`/bookings/${booking.body.id}/cv`).set(bearer(await studentToken(app))).expect(403);
  });
});
