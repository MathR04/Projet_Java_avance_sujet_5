import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BOOKING, SETTINGS, SME_DETAIL } from '../fixtures';
import { fakeApi, makeToken, nestError, pathOf, renderApp } from '../test-utils';

const base = {
  'GET /companies/c-sme': () => Response.json(SME_DETAIL),
  'GET /settings': () => Response.json(SETTINGS),
};

describe('CompanyPage', () => {
  it('shows the offers and the slots, and asks a visitor to log in to book', async () => {
    fakeApi(base);
    renderApp('/companies/c-sme');

    expect(await screen.findByRole('heading', { name: 'Provence Capteurs' })).toBeInTheDocument();
    expect(screen.getByText('Banc de test de capteurs')).toBeInTheDocument();
    expect(screen.getByText('Complet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Connectez-vous' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Réserver/ })).not.toBeInTheDocument();
  });

  it('a 2A books a free slot: POST /bookings with its id', async () => {
    let booked = false;
    const requests = fakeApi({
      ...base,
      'GET /me/bookings': () => Response.json(booked ? [BOOKING] : []),
      'POST /bookings': () => {
        booked = true;
        return Response.json(BOOKING, { status: 201 });
      },
    });
    renderApp('/companies/c-sme', { token: makeToken({ role: 'STUDENT', year: 2 }) });

    await userEvent.click(await screen.findByRole('button', { name: /Réserver/ }));

    const post = requests.find((request) => request.method === 'POST' && pathOf(request) === '/bookings');
    await expect(post!.json()).resolves.toEqual({ slotId: 's2' });
    expect(await screen.findByText(/Rendez-vous réservé/)).toBeInTheDocument();
    expect(await screen.findByText('Votre rendez-vous')).toBeInTheDocument();
  });

  it('shows the rule the API refused the booking with', async () => {
    fakeApi({
      ...base,
      'GET /me/bookings': () => Response.json([]),
      'POST /bookings': () => nestError(409, 'Vous avez déjà un rendez-vous à cette heure-là'),
    });
    renderApp('/companies/c-sme', { token: makeToken({ role: 'STUDENT', year: 3 }) });

    await userEvent.click(await screen.findByRole('button', { name: /Réserver/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Vous avez déjà un rendez-vous à cette heure-là');
  });

  it('a 1A sees why they cannot book yet, and no button', async () => {
    fakeApi({ ...base, 'GET /me/bookings': () => Response.json([]) });
    renderApp('/companies/c-sme', { token: makeToken({ role: 'STUDENT', year: 1 }) });

    expect(await screen.findByRole('note')).toHaveTextContent('Les 2A et 3A réservent en premier');
    expect(screen.queryByRole('button', { name: /Réserver/ })).not.toBeInTheDocument();
  });

  it('an unknown company: a message, not a blank page', async () => {
    fakeApi({ 'GET /settings': () => Response.json(SETTINGS) });
    renderApp('/companies/nope');

    expect(await screen.findByRole('alert')).toHaveTextContent('ne vient pas au forum');
  });
});
