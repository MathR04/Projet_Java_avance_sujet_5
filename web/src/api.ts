import type {
  Booking,
  Company,
  CompanyDetail,
  CompanyInput,
  Dashboard,
  Offer,
  OfferInput,
  Recruiter,
  Schedule,
  Settings,
} from './types';

/** Où tourne l'API, lu dans `.env`. Par défaut, le port de `npm run start:dev`. */
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Une réponse de l'API qui n'est pas ok : un 4xx ou un 5xx. `details` porte ce
 * que l'API a expliqué : une phrase par champ invalide pour un 400, la règle
 * de réservation non respectée pour un 409.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly details: string[];

  constructor(status: number, message: string, details: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;

  const body: unknown = await res.json().catch(() => undefined);
  const message = body && typeof body === 'object' && 'message' in body ? body.message : undefined;
  const details = Array.isArray(message) ? message.map(String) : typeof message === 'string' ? [message] : [];
  throw new ApiError(res.status, `L'API a répondu ${res.status}`, details);
}

/** Ce que l'API a dit de l'erreur, en une phrase lisible par un humain. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.details.length > 0) return error.details.join(' ');
  if (error instanceof Error) return error.message;
  return 'Erreur inconnue';
}

/**
 * Toutes les requêtes passent par `call` : le token dans l'en-tête, le corps
 * en JSON (ou en multipart pour le CV), et une ApiError si la réponse n'est pas ok.
 */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  token?: string | null;
  body?: unknown;
}

async function call<T>(path: string, { method = 'GET', token, body }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body; // le navigateur pose lui-même le Content-Type multipart
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}${path}`, { method, headers, body: payload });
  await throwIfNotOk(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Les comptes ─────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<string> {
  const { access_token } = await call<{ access_token: string }>('/auth/login', { method: 'POST', body: { email, password } });
  return access_token;
}

export interface Registration {
  email: string;
  name: string;
  password: string;
  year: number;
}

export async function register(registration: Registration): Promise<string> {
  const { access_token } = await call<{ access_token: string }>('/auth/register', { method: 'POST', body: registration });
  return access_token;
}

// ─── Le catalogue ────────────────────────────────────────────────────────────

export const fetchCompanies = () => call<Company[]>('/companies');
export const fetchCompany = (id: string) => call<CompanyDetail>(`/companies/${id}`);
export const fetchSettings = () => call<Settings>('/settings');

// ─── L'élève ─────────────────────────────────────────────────────────────────

export const fetchMyBookings = (token: string) => call<Booking[]>('/me/bookings', { token });
export const bookSlot = (slotId: string, token: string) => call<Booking>('/bookings', { method: 'POST', token, body: { slotId } });
export const cancelBooking = (id: string, token: string) => call<void>(`/bookings/${id}`, { method: 'DELETE', token });

export const fetchMyCv = (token: string) => call<{ filename: string | null }>('/me/cv', { token });
export function uploadCv(file: File, token: string) {
  const form = new FormData();
  form.append('cv', file);
  return call<{ filename: string; size: number }>('/me/cv', { method: 'PUT', token, body: form });
}
export const deleteCv = (token: string) => call<void>('/me/cv', { method: 'DELETE', token });

// ─── Le recruteur ────────────────────────────────────────────────────────────

export const fetchSchedule = (token: string) => call<Schedule>('/recruiter/schedule', { token });

/** Le PDF d'un CV, en Blob : un lien simple n'enverrait pas le token. */
export async function fetchBookingCv(bookingId: string, token: string): Promise<Blob> {
  const res = await fetch(`${API_URL}/bookings/${bookingId}/cv`, { headers: { Authorization: `Bearer ${token}` } });
  await throwIfNotOk(res);
  return res.blob();
}

// ─── L'équipe ────────────────────────────────────────────────────────────────

export const fetchDashboard = (token: string) => call<Dashboard>('/dashboard', { token });
export const updateSettings = (openToFirstYears: boolean, token: string) =>
  call<{ openToFirstYears: boolean }>('/settings', { method: 'PATCH', token, body: { openToFirstYears } });

export const createCompany = (company: CompanyInput, token: string) =>
  call<CompanyDetail>('/companies', { method: 'POST', token, body: company });
export const updateCompany = (id: string, company: Partial<CompanyInput>, token: string) =>
  call<CompanyDetail>(`/companies/${id}`, { method: 'PATCH', token, body: company });
export const deleteCompany = (id: string, token: string) => call<void>(`/companies/${id}`, { method: 'DELETE', token });

export const createOffer = (companyId: string, offer: OfferInput, token: string) =>
  call<Offer>(`/companies/${companyId}/offers`, { method: 'POST', token, body: offer });
export const deleteOffer = (id: string, token: string) => call<void>(`/offers/${id}`, { method: 'DELETE', token });

export const fetchRecruiters = (companyId: string, token: string) => call<Recruiter[]>(`/companies/${companyId}/recruiters`, { token });
export const createRecruiter = (companyId: string, recruiter: { name: string; email: string }, token: string) =>
  call<Recruiter & { password: string }>(`/companies/${companyId}/recruiters`, { method: 'POST', token, body: recruiter });
