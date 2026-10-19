import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError, bookSlot, errorMessage, fetchCompany, fetchMyBookings, fetchSettings } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { formatPlaces, formatSlot } from '../format';

/**
 * Fonctionnalités 1 et 2 : une entreprise, ses offres, puis ses créneaux, que
 * l'élève réserve d'un clic.
 *
 * Ce que la page affiche à la place du bouton « Réserver » :
 *   - déconnecté          un lien vers la connexion
 *   - 1A, pas encore ouvert  pourquoi il ne peut pas réserver
 *   - déjà un rendez-vous ici  lequel
 *   - recruteur, équipe   « Libre », sans bouton
 * Le front ne fait que prévenir : c'est l'API qui applique les règles, et son
 * refus s'affiche tel quel.
 */
export const CompanyPage = () => {
  const { id = '' } = useParams();
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const isStudent = user?.role === 'STUDENT';
  const company = useQuery({ queryKey: ['company', id], queryFn: () => fetchCompany(id) });
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const bookings = useQuery({
    queryKey: ['bookings', token],
    queryFn: () => fetchMyBookings(token!),
    enabled: isStudent && token !== null,
  });

  const book = useMutation({
    mutationFn: (slotId: string) => bookSlot(slotId, token!),
    onSuccess: (booking) => {
      setMessage({ kind: 'success', text: `Rendez-vous réservé, ${formatSlot(booking.slot.startsAt, booking.slot.endsAt)}.` });
      void queryClient.invalidateQueries({ queryKey: ['company', id] });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (error) => {
      setMessage({ kind: 'error', text: errorMessage(error) });
      // CHOIX : sur un 409, la page recharge les places. Le cas typique : un autre
      // élève a pris la dernière place entre l'affichage et le clic.
      if (error instanceof ApiError && error.status === 409) void queryClient.invalidateQueries({ queryKey: ['company', id] });
    },
  });

  if (company.isPending) {
    return (
      <p className="status" role="status">
        Chargement…
      </p>
    );
  }
  if (company.isError) {
    const notFound = company.error instanceof ApiError && company.error.status === 404;
    return (
      <section className="page">
        <div className="error" role="alert">
          {notFound ? 'Cette entreprise ne vient pas au forum.' : `Impossible de charger l’entreprise : ${errorMessage(company.error)}`}
        </div>
        <Link className="back" to="/">
          ← Toutes les entreprises
        </Link>
      </section>
    );
  }

  const { data } = company;
  const myBookingHere = bookings.data?.find((booking) => booking.slot.company.id === data.id);
  const firstYearWaiting = isStudent && user.year === 1 && settings.data?.openToFirstYears === false;
  const canBook = isStudent && !firstYearWaiting && !myBookingHere;
  const now = Date.now();

  return (
    <section className="page detail">
      <Link className="back" to="/">
        ← Toutes les entreprises
      </Link>

      <div className="detail-header">
        <h2 className="detail-title">{data.name}</h2>
        {data.stand && <span className="badge">Stand {data.stand}</span>}
      </div>
      {data.description && <p>{data.description}</p>}
      {data.website && (
        <p>
          <a href={data.website} target="_blank" rel="noreferrer">
            {data.website}
          </a>
        </p>
      )}

      <h3>Les stages proposés</h3>
      {data.offers.length === 0 && <p className="empty">Les offres arrivent bientôt.</p>}
      <ul className="offers">
        {data.offers.map((offer) => (
          <li key={offer.id} className="offer">
            <h4>{offer.title}</h4>
            <p className="muted">
              {offer.duration}
              {offer.location ? ` · ${offer.location}` : ''}
            </p>
            {offer.description && <p>{offer.description}</p>}
          </li>
        ))}
      </ul>

      <h3>Prendre rendez-vous</h3>
      <p className="muted">{formatPlaces(data.freePlaces)} sur {data.totalPlaces}. Sans rendez-vous, le stand reste ouvert à tous.</p>

      {!user && (
        <p className="hint">
          <Link to="/login" state={{ from: `/companies/${data.id}` }}>
            Connectez-vous
          </Link>{' '}
          ou <Link to="/register">créez un compte élève</Link> pour réserver un créneau.
        </p>
      )}
      {firstYearWaiting && (
        <p className="notice" role="note">
          Les 2A et 3A réservent en premier. Les réservations ouvriront bientôt aux 1A&nbsp;: en attendant, les stands vous sont ouverts le jour J.
        </p>
      )}
      {myBookingHere && (
        <p className="notice" role="note">
          Vous avez rendez-vous avec {data.name}, {formatSlot(myBookingHere.slot.startsAt, myBookingHere.slot.endsAt)}.{' '}
          <Link to="/me">Mes rendez-vous</Link>
        </p>
      )}
      {message && (
        <div className={message.kind === 'error' ? 'error' : 'success'} role={message.kind === 'error' ? 'alert' : 'status'}>
          {message.text}
        </div>
      )}

      <ul className="slots" aria-label="Créneaux">
        {data.slots.map((slot) => {
          const full = slot.booked >= slot.capacity;
          const past = new Date(slot.startsAt).getTime() <= now;
          const mine = myBookingHere?.slot.id === slot.id;
          const label = formatSlot(slot.startsAt, slot.endsAt);
          return (
            <li key={slot.id} className={mine ? 'slot mine' : full || past ? 'slot taken' : 'slot'}>
              <span>{label}</span>
              {mine ? (
                <strong>Votre rendez-vous</strong>
              ) : full ? (
                <span className="muted">Complet</span>
              ) : past ? (
                <span className="muted">Passé</span>
              ) : canBook ? (
                <button
                  type="button"
                  className="button small"
                  disabled={book.isPending}
                  aria-label={`Réserver ${label}`}
                  onClick={() => book.mutate(slot.id)}
                >
                  Réserver
                </button>
              ) : (
                <span className="muted">Libre</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
