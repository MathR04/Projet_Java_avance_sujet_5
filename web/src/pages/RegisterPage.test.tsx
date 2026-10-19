import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SETTINGS } from '../fixtures';
import { fakeApi, makeToken, nestError, pathOf, renderApp } from '../test-utils';

async function fill() {
  await userEvent.type(screen.getByLabelText('Prénom et nom'), 'Camille Martin');
  await userEvent.type(screen.getByLabelText('E-mail'), 'camille@etu.test');
  await userEvent.type(screen.getByLabelText('Mot de passe'), 'password');
  await userEvent.selectOptions(screen.getByLabelText('Année'), '2');
  await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));
}

describe('RegisterPage', () => {
  it('sends the year as a number, and logs the student in', async () => {
    const requests = fakeApi({
      'POST /auth/register': () => Response.json({ access_token: makeToken({ name: 'Camille Martin' }) }, { status: 201 }),
      'GET /companies': () => Response.json([]),
      'GET /settings': () => Response.json(SETTINGS),
    });
    renderApp('/register');

    await fill();

    const register = requests.find((request) => pathOf(request) === '/auth/register');
    await expect(register!.json()).resolves.toEqual({ name: 'Camille Martin', email: 'camille@etu.test', password: 'password', year: 2 });
    expect(await screen.findByText('Camille Martin')).toBeInTheDocument();
  });

  it('says so when the email is already used', async () => {
    fakeApi({ 'POST /auth/register': () => nestError(409, 'An account already exists for this email') });
    renderApp('/register');

    await fill();

    expect(await screen.findByRole('alert')).toHaveTextContent('Un compte existe déjà avec cet e-mail.');
  });
});
