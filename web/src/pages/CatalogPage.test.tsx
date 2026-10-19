import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BIG_GROUP, SETTINGS, SME } from '../fixtures';
import { fakeApi, nestError, renderApp } from '../test-utils';

const names = () =>
  within(screen.getByRole('list', { name: 'Entreprises' }))
    .getAllByRole('heading')
    .map((heading) => heading.textContent);

describe('CatalogPage', () => {
  it('shows the companies and their internships, the most free places first', async () => {
    fakeApi({ 'GET /companies': () => Response.json([BIG_GROUP, SME]), 'GET /settings': () => Response.json(SETTINGS) });
    renderApp('/');

    expect(await screen.findByText('Banc de test de capteurs')).toBeInTheDocument();
    expect(names()).toEqual(['Provence Capteurs', 'Valmont Semiconducteurs']);
    expect(screen.getByText('20 places libres')).toBeInTheDocument();
  });

  it('sorts by name on demand', async () => {
    fakeApi({ 'GET /companies': () => Response.json([SME, BIG_GROUP]), 'GET /settings': () => Response.json(SETTINGS) });
    renderApp('/');
    await screen.findByText('Banc de test de capteurs');

    await userEvent.selectOptions(screen.getByLabelText('Trier'), 'name');

    expect(names()).toEqual(['Provence Capteurs', 'Valmont Semiconducteurs'].sort());
  });

  it('searches the offers too: « Aix » finds the SME by the location of its internship', async () => {
    fakeApi({ 'GET /companies': () => Response.json([BIG_GROUP, SME]), 'GET /settings': () => Response.json(SETTINGS) });
    renderApp('/');
    await screen.findByText('Banc de test de capteurs');

    await userEvent.type(screen.getByLabelText('Rechercher une entreprise ou un stage'), 'aix');

    expect(names()).toEqual(['Provence Capteurs']);
  });

  it('says so when the API fails', async () => {
    fakeApi({ 'GET /companies': () => nestError(500, 'Internal server error'), 'GET /settings': () => Response.json(SETTINGS) });
    renderApp('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger les entreprises');
  });
});
