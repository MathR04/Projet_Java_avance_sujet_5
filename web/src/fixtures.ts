import type { Booking, Company, CompanyDetail, Dashboard, Schedule, Settings } from './types';

/**
 * Des réponses de l'API, pour les tests du front : un grand groupe presque
 * complet, une PME avec des places. Le forum est en 2099 : les créneaux restent
 * à venir quelle que soit la date du test.
 */

export const SETTINGS: Settings = {
  openToFirstYears: false,
  forum: { date: '2099-11-19', opensAt: '09:00', closesAt: '17:00', slotMinutes: 20, maxBookingsPerStudent: 5 },
};

export const BIG_GROUP: Company = {
  id: 'c-big',
  name: 'Valmont Semiconducteurs',
  description: 'Grand groupe de semi-conducteurs.',
  stand: 'A1',
  website: null,
  recruiterCount: 2,
  offers: [{ id: 'o1', title: 'Vérification numérique', description: '', duration: '6 mois', location: 'Rousset', companyId: 'c-big' }],
  totalPlaces: 48,
  freePlaces: 2,
};

export const SME: Company = {
  id: 'c-sme',
  name: 'Provence Capteurs',
  description: 'PME de capteurs MEMS.',
  stand: 'B4',
  website: null,
  recruiterCount: 1,
  offers: [
    { id: 'o2', title: 'Banc de test de capteurs', description: 'Électronique et Python.', duration: '6 mois', location: 'Aix', companyId: 'c-sme' },
  ],
  totalPlaces: 24,
  freePlaces: 20,
};

export const SME_DETAIL: CompanyDetail = {
  ...SME,
  slots: [
    { id: 's1', startsAt: '2099-11-19T08:00:00.000Z', endsAt: '2099-11-19T08:20:00.000Z', capacity: 1, booked: 1 },
    { id: 's2', startsAt: '2099-11-19T08:20:00.000Z', endsAt: '2099-11-19T08:40:00.000Z', capacity: 1, booked: 0 },
  ],
};

export const BOOKING: Booking = {
  id: 'b1',
  slot: { id: 's2', startsAt: '2099-11-19T08:20:00.000Z', endsAt: '2099-11-19T08:40:00.000Z', company: { id: 'c-sme', name: 'Provence Capteurs', stand: 'B4' } },
};

export const SCHEDULE: Schedule = {
  id: 'c-sme',
  name: 'Provence Capteurs',
  stand: 'B4',
  slots: [
    {
      id: 's1',
      startsAt: '2099-11-19T08:00:00.000Z',
      endsAt: '2099-11-19T08:20:00.000Z',
      capacity: 1,
      bookings: [{ id: 'b1', student: { name: 'Camille Martin', email: 'camille@etu.test', year: 3, hasCv: true } }],
    },
    { id: 's2', startsAt: '2099-11-19T08:20:00.000Z', endsAt: '2099-11-19T08:40:00.000Z', capacity: 1, bookings: [] },
  ],
};

export const DASHBOARD: Dashboard = {
  settings: { openToFirstYears: false },
  totals: { companies: 2, students: 10, studentsByYear: { 1: 2, 2: 4, 3: 4 }, studentsWithBooking: 6, bookings: 9, emptyMorningStands: 1 },
  stands: [
    { id: 'c-sme', name: 'Provence Capteurs', stand: 'B4', recruiterCount: 1, offers: 1, recruiterAccounts: 0, totalPlaces: 24, booked: 0, morningBooked: 0, fillRate: 0, bookedNow: 0 },
    { id: 'c-big', name: 'Valmont Semiconducteurs', stand: 'A1', recruiterCount: 2, offers: 1, recruiterAccounts: 2, totalPlaces: 48, booked: 9, morningBooked: 5, fillRate: 0.19, bookedNow: 1 },
  ],
};
