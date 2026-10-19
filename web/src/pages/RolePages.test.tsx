import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BOOKING, DASHBOARD, SCHEDULE, SETTINGS } from '../fixtures';
import { fakeApi, makeToken, pathOf, renderApp } from '../test-utils';

const student = makeToken({ role: 'STUDENT', year: 2 });
const recruiter = makeToken({ role: 'RECRUITER', name: 'Sophie', companyId: 'c-sme' });
const staff = makeToken({ role: 'STAFF', name: 'Équipe du forum' });

describe('the pages of each role', () => {
  it('a logged-out visitor is sent to the login page', () => {
    renderApp('/me');
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
  });

  it('a student cannot open the dashboard of the staff', () => {
    renderApp('/admin', { token: student });
    expect(screen.getByRole('alert')).toHaveTextContent('pas accessible avec votre compte');
  });

  it('the student sees their bookings, and cancels one with DELETE /bookings/:id', async () => {
    let bookings = [BOOKING];
    const requests = fakeApi({
      'GET /me/bookings': () => Response.json(bookings),
      'GET /me/cv': () => Response.json({ filename: null }),
      'GET /settings': () => Response.json(SETTINGS),
      'DELETE /bookings/b1': () => {
        bookings = [];
        return new Response(null, { status: 204 });
      },
    });
    renderApp('/me', { token: student });

    expect(await screen.findByRole('link', { name: 'Provence Capteurs' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Annuler le rendez-vous avec Provence Capteurs' }));

    expect(requests.some((request) => request.method === 'DELETE' && pathOf(request) === '/bookings/b1')).toBe(true);
    expect(await screen.findByText(/Aucun rendez-vous pour l’instant/)).toBeInTheDocument();
  });

  it('the recruiter sees who they meet, with the year and the CV', async () => {
    fakeApi({ 'GET /recruiter/schedule': () => Response.json(SCHEDULE) });
    renderApp('/recruiter', { token: recruiter });

    const row = (await screen.findByText('Camille Martin')).closest('tr')!;
    expect(within(row).getByText('3A')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Voir le CV' })).toBeInTheDocument();
    expect(screen.queryByText('Libre')).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Seulement les créneaux réservés'));
    expect(screen.getByText('Libre')).toBeInTheDocument();
  });

  it('the staff sees the empty stands first, flagged, and opens the bookings to the 1A', async () => {
    const requests = fakeApi({
      'GET /dashboard': () => Response.json(DASHBOARD),
      'PATCH /settings': () => Response.json({ openToFirstYears: true }),
    });
    renderApp('/admin', { token: staff });

    const rows = (await screen.findAllByRole('row')).slice(1);
    expect(within(rows[0]).getByRole('link')).toHaveTextContent('Provence Capteurs');
    expect(rows[0]).toHaveClass('alert');
    expect(rows[1]).not.toHaveClass('alert');

    await userEvent.click(screen.getByLabelText(/Ouvrir les réservations aux 1A/));
    const patch = requests.find((request) => request.method === 'PATCH');
    await expect(patch!.json()).resolves.toEqual({ openToFirstYears: true });
  });

  it('the header shows the links of the role', () => {
    renderApp('/nowhere', { token: staff });
    expect(screen.getByRole('link', { name: 'Tableau de bord' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mes rendez-vous' })).not.toBeInTheDocument();
    expect(screen.getByText('Équipe du forum')).toBeInTheDocument();
  });
});
