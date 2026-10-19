import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { errorMessage, fetchDashboard, updateSettings } from '../api';
import { useAuth } from '../auth/AuthProvider';

/**
 * Fonctionnalité 3, côté équipe : ce qui se passe sur chaque stand (réponse 5
 * de Léo : « voir ce qui se passe sur chaque stand, pour repérer ceux qui
 * restent vides »).
 *
 * CHOIX : les stands les moins remplis en haut (trié par l'API), et en rouge
 * ceux qui n'ont aucun rendez-vous le matin : c'est l'indicateur de réussite
 * de Léo, « plus aucune PME qui n'a vu personne à midi ».
 * CHOIX : rafraîchi toutes les 30 secondes, pour suivre la journée sans recharger.
 */
export const AdminPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: ['dashboard', token], queryFn: () => fetchDashboard(token!), refetchInterval: 30_000 });

  const toggle = useMutation({
    mutationFn: (open: boolean) => updateSettings(open, token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  if (dashboard.isPending) {
    return (
      <p className="status" role="status">
        Chargement…
      </p>
    );
  }
  if (dashboard.isError) {
    return (
      <div className="error" role="alert">
        {errorMessage(dashboard.error)}
      </div>
    );
  }

  const { totals, stands, settings } = dashboard.data;

  return (
    <section className="page">
      <div className="detail-header">
        <h2>Tableau de bord</h2>
        <Link className="button" to="/admin/companies/new">
          Ajouter une entreprise
        </Link>
      </div>

      <dl className="tiles">
        <div>
          <dt>Entreprises</dt>
          <dd>{totals.companies}</dd>
        </div>
        <div>
          <dt>Élèves inscrits</dt>
          <dd>{totals.students}</dd>
          <dd className="muted">
            {totals.studentsByYear['1'] ?? 0} 1A · {totals.studentsByYear['2'] ?? 0} 2A · {totals.studentsByYear['3'] ?? 0} 3A
          </dd>
        </div>
        <div>
          <dt>Rendez-vous</dt>
          <dd>{totals.bookings}</dd>
          <dd className="muted">{totals.studentsWithBooking} élèves avec au moins un</dd>
        </div>
        <div className={totals.emptyMorningStands > 0 ? 'alert' : ''}>
          <dt>Stands vides le matin</dt>
          <dd>{totals.emptyMorningStands}</dd>
        </div>
      </dl>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={settings.openToFirstYears}
          disabled={toggle.isPending}
          onChange={(e) => toggle.mutate(e.target.checked)}
        />{' '}
        Ouvrir les réservations aux 1A {settings.openToFirstYears ? '(ouvertes)' : '(seuls les 2A et 3A réservent)'}
      </label>

      <table className="table">
        <caption>Les stands, les moins demandés d’abord</caption>
        <thead>
          <tr>
            <th scope="col">Entreprise</th>
            <th scope="col">Stand</th>
            <th scope="col">Rendez-vous</th>
            <th scope="col">Matin</th>
            <th scope="col">En ce moment</th>
            <th scope="col">Offres</th>
            <th scope="col">Comptes recruteurs</th>
          </tr>
        </thead>
        <tbody>
          {stands.map((stand) => (
            <tr key={stand.id} className={stand.morningBooked === 0 ? 'alert' : ''}>
              <td>
                <Link to={`/admin/companies/${stand.id}`}>{stand.name}</Link>
              </td>
              <td>{stand.stand ?? '—'}</td>
              <td>
                <meter min={0} max={1} value={stand.fillRate} aria-label={`Remplissage de ${stand.name}`} /> {stand.booked} / {stand.totalPlaces}
              </td>
              <td>{stand.morningBooked}</td>
              <td>{stand.bookedNow}</td>
              <td>{stand.offers}</td>
              <td>
                {stand.recruiterAccounts} / {stand.recruiterCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};
