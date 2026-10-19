/**
 * Ce que l'API renvoie, champ pour champ. Les dates arrivent en chaînes ISO.
 * À tenir à jour avec les services de l'API : ce sont des promesses faites au
 * compilateur, rien ne les vérifie à l'exécution.
 */

export interface Offer {
  id: string;
  title: string;
  description: string;
  duration: string;
  location: string | null;
  companyId: string;
}

export interface Company {
  id: string;
  name: string;
  description: string;
  stand: string | null;
  website: string | null;
  recruiterCount: number;
  offers: Offer[];
  totalPlaces: number;
  freePlaces: number;
}

export interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  booked: number;
}

export interface CompanyDetail extends Company {
  slots: Slot[];
}

export interface CompanyInput {
  name: string;
  description?: string;
  stand?: string;
  website?: string;
  recruiterCount?: number;
}

export interface OfferInput {
  title: string;
  duration: string;
  description?: string;
  location?: string;
}

export interface Booking {
  id: string;
  slot: {
    id: string;
    startsAt: string;
    endsAt: string;
    company: { id: string; name: string; stand: string | null };
  };
}

export interface Settings {
  openToFirstYears: boolean;
  forum: { date: string; opensAt: string; closesAt: string; slotMinutes: number; maxBookingsPerStudent: number };
}

export interface Schedule {
  id: string;
  name: string;
  stand: string | null;
  slots: {
    id: string;
    startsAt: string;
    endsAt: string;
    capacity: number;
    bookings: { id: string; student: { name: string; email: string; year: number | null; hasCv: boolean } }[];
  }[];
}

export interface Stand {
  id: string;
  name: string;
  stand: string | null;
  recruiterCount: number;
  offers: number;
  recruiterAccounts: number;
  totalPlaces: number;
  booked: number;
  morningBooked: number;
  fillRate: number;
  bookedNow: number;
}

export interface Dashboard {
  settings: { openToFirstYears: boolean };
  totals: {
    companies: number;
    students: number;
    studentsByYear: Record<string, number>;
    studentsWithBooking: number;
    bookings: number;
    emptyMorningStands: number;
  };
  stands: Stand[];
}

export interface Recruiter {
  id: string;
  email: string;
  name: string;
}
