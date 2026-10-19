import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { cancelBooking, deleteCv, errorMessage, fetchMyBookings, fetchMyCv, fetchSettings, uploadCv } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { formatSlot } from '../format';

/**
 * Fonctionnalité 2, côté élève : ses rendez-vous, dans l'ordre de la journée,
 * avec le stand où aller, et son CV.
 */
export const MyBookingsPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const bookings = useQuery({ queryKey: ['bookings', token], queryFn: () => fetchMyBookings(token!) });
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelBooking(id, token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });

  const max = settings.data?.forum.maxBookingsPerStudent;

  return (
    <section className="page">
      <h2>Mes rendez-vous</h2>
      {bookings.isPending && (
        <p className="status" role="status">
          Chargement…
        </p>
      )}
      {bookings.isError && (
        <div className="error" role="alert">
          {errorMessage(bookings.error)}
        </div>
      )}
      {bookings.data?.length === 0 && (
        <p className="empty">
          Aucun rendez-vous pour l’instant. <Link to="/">Parcourez les entreprises</Link>&nbsp;: les PME ont souvent des créneaux libres.
        </p>
      )}
      {bookings.data && bookings.data.length > 0 && (
        <>
          {max && (
            <p className="muted">
              {bookings.data.length} sur {max} rendez-vous au plus.
            </p>
          )}
          <ul className="bookings" aria-label="Mes rendez-vous">
            {bookings.data.map((booking) => (
              <li key={booking.id} className="booking">
                <span className="booking-time">{formatSlot(booking.slot.startsAt, booking.slot.endsAt)}</span>
                <span>
                  <Link to={`/companies/${booking.slot.company.id}`}>{booking.slot.company.name}</Link>
                  {booking.slot.company.stand && <span className="muted"> · stand {booking.slot.company.stand}</span>}
                </span>
                <button
                  type="button"
                  className="link-button"
                  disabled={cancel.isPending}
                  aria-label={`Annuler le rendez-vous avec ${booking.slot.company.name}`}
                  onClick={() => cancel.mutate(booking.id)}
                >
                  Annuler
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {cancel.isError && (
        <div className="error" role="alert">
          {errorMessage(cancel.error)}
        </div>
      )}

      <CvSection />
    </section>
  );
};

/** Le CV : seuls les recruteurs des entreprises réservées le voient. */
const CvSection = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const cv = useQuery({ queryKey: ['cv', token], queryFn: () => fetchMyCv(token!) });

  const upload = useMutation({
    mutationFn: (file: File) => uploadCv(file, token!),
    onSuccess: () => {
      setError('');
      if (input.current) input.current.value = '';
      void queryClient.invalidateQueries({ queryKey: ['cv'] });
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: () => deleteCv(token!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['cv'] }),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const file = input.current?.files?.[0];
    if (!file) return setError('Choisissez un fichier PDF.');
    // Vérifié aussi par l'API : ici, c'est seulement pour ne pas envoyer 10 Mo pour rien.
    if (file.size > 2 * 1024 * 1024) return setError('Le CV dépasse 2 Mo.');
    upload.mutate(file);
  };

  return (
    <section className="cv">
      <h3>Mon CV</h3>
      <p className="muted">Certaines entreprises lisent le CV avant le rendez-vous. Seules celles chez qui vous avez réservé peuvent le voir.</p>
      {cv.data?.filename ? (
        <p>
          CV déposé&nbsp;: <strong>{cv.data.filename}</strong>{' '}
          <button type="button" className="link-button" onClick={() => remove.mutate()}>
            Retirer
          </button>
        </p>
      ) : (
        cv.isSuccess && <p>Aucun CV déposé.</p>
      )}
      <form className="form inline" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="cv-file">{cv.data?.filename ? 'Remplacer par un autre PDF' : 'Déposer un PDF'} (2 Mo au plus)</label>
          <input id="cv-file" ref={input} type="file" accept="application/pdf" />
        </div>
        <button className="button" type="submit" disabled={upload.isPending}>
          Envoyer
        </button>
      </form>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
};
