import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TOKEN_KEY } from '../auth/AuthProvider';
import { SCHEDULE, SETTINGS } from '../fixtures';
import { fakeApi, makeToken, nestError, pathOf, renderApp } from '../test-utils';

async function logIn(email: string, password: string) {
  await userEvent.type(screen.getByLabelText('E-mail'), email);
  await userEvent.type(screen.getByLabelText('Mot de passe'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
}

describe('LoginPage', () => {
  it('sends the email and password to POST /auth/login, and keeps the token', async () => {
    const token = makeToken({ role: 'STUDENT' });
    const requests = fakeApi({
      'POST /auth/login': () => Response.json({ access_token: token }),
      'GET /companies': () => Response.json([]),
      'GET /settings': () => Response.json(SETTINGS),
    });
    renderApp('/login');

    await logIn('camille@etu.test', 'password');

    const login = requests.find((request) => pathOf(request) === '/auth/login');
    await expect(login!.json()).resolves.toEqual({ email: 'camille@etu.test', password: 'password' });
    expect(await screen.findByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
  });

  it('sends a recruiter straight to their schedule', async () => {
    fakeApi({
      'POST /auth/login': () => Response.json({ access_token: makeToken({ role: 'RECRUITER', name: 'Sophie', companyId: 'c-sme' }) }),
      'GET /recruiter/schedule': () => Response.json(SCHEDULE),
    });
    renderApp('/login');

    await logIn('sophie@company.test', 'password');

    expect(await screen.findByRole('heading', { name: /Planning de Provence Capteurs/ })).toBeInTheDocument();
  });

  it('says so on a wrong password, and stays logged out', async () => {
    fakeApi({ 'POST /auth/login': () => nestError(401, 'Wrong email or password') });
    renderApp('/login');

    await logIn('camille@etu.test', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou mot de passe incorrect.');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
