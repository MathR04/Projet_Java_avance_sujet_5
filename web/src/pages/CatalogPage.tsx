import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { errorMessage, fetchCompanies, fetchSettings } from '../api';
import { formatDay, formatPlaces } from '../format';
import type { Company } from '../types';

type Sort = 'free' | 'name';

/**
 * Cherche dans le nom, la description et les offres : « capteur », « 6 mois », « Marseille ».
 * CHOIX : une seule recherche en texte libre plutôt que des filtres par durée
 * ou par lieu : la durée est du texte libre dans les offres (voir schema.prisma).
 */
export function matches(company: Company, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    company.name,
    company.description,
    ...company.offers.flatMap((offer) => [offer.title, offer.description, offer.duration, offer.location ?? '']),
  ];
  return haystack.some((text) => text.toLowerCase().includes(needle));
}

export function sortCompanies(companies: Company[], sort: Sort): Company[] {
  return [...companies].sort((a, b) =>
    sort === 'free' ? b.freePlaces - a.freePlaces || a.name.localeCompare(b.name) : a.name.localeCompare(b.name),
  );
}

/**
 * Fonctionnalité 1 : le catalogue, avant le forum, qui vient et quels stages
 * (réponse 3 de Léo : « Une PME avec un super stage, ils passeraient la voir »).
 *
 * CHOIX : tri par défaut sur les places libres, pas sur le nom. Les grands
 * groupes, vite complets, descendent ; les PME, encore libres, remontent. C'est
 * le seul endroit où l'application pousse les élèves vers les PME. L'élève
 * peut toujours trier par nom.
 */
export const CatalogPage = () => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('free');
  const companies = useQuery({ queryKey: ['companies'], queryFn: fetchCompanies });
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });

  const visible = companies.data ? sortCompanies(companies.data.filter((company) => matches(company, search)), sort) : [];

  return (
    <section className="page">
      {settings.data && (
        <p className="intro">
          Le forum a lieu le <strong>{formatDay(settings.data.forum.date)}</strong>, de {settings.data.forum.opensAt.replace(':', ' h ')} à{' '}
          {settings.data.forum.closesAt.replace(':', ' h ')}, au gymnase. Réservez un rendez-vous de {settings.data.forum.slotMinutes} minutes
          pour ne pas faire la queue&nbsp;: les stands restent ouverts à tous.
        </p>
      )}

      <div className="toolbar">
        <div className="field">
          <label htmlFor="search">Rechercher une entreprise ou un stage</label>
          <input id="search" type="search" placeholder="capteurs, 6 mois, Marseille…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="sort">Trier</label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="free">Le plus de places libres d’abord</option>
            <option value="name">Par nom</option>
          </select>
        </div>
      </div>

      {companies.isPending && (
        <p className="status" role="status">
          Chargement…
        </p>
      )}
      {companies.isError && (
        <div className="error" role="alert">
          Impossible de charger les entreprises&nbsp;: {errorMessage(companies.error)}
        </div>
      )}
      {companies.data && visible.length === 0 && <p className="empty">Aucune entreprise ne correspond à « {search} ».</p>}

      <ul className="model-list" aria-label="Entreprises">
        {visible.map((company) => (
          <li key={company.id} className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Link to={`/companies/${company.id}`}>{company.name}</Link>
              </h3>
              {company.stand && <span className="badge">Stand {company.stand}</span>}
            </div>
            <p className="card-description">{company.description}</p>
            <ul className="offer-list">
              {company.offers.map((offer) => (
                <li key={offer.id}>
                  {offer.title} <span className="muted">· {offer.duration}{offer.location ? ` · ${offer.location}` : ''}</span>
                </li>
              ))}
            </ul>
            <p className={company.freePlaces > 0 ? 'places' : 'places full'}>
              {company.freePlaces > 0 ? formatPlaces(company.freePlaces) : 'Complet, le stand reste ouvert'}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};
