import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { errorMessage, fetchBookingCv, fetchSchedule } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { formatSlot, yearLabel } from '../format';

/**
 * Fonctionnalité 3, côté recruteur : le jour J, qui il voit, et quand.
 *
 * CHOIX : rafraîchi toutes les minutes, plutôt que des notifications en temps
 * réel (WebSocket). Un rendez-vous dure 20 minutes : une minute de retard ne
 * gêne personne, et c'est bien plus simple.
 * CHOIX : par défaut, seulement les créneaux réservés : 24 lignes dont 20
 * vides noieraient les 4 qui comptent.
 */
export const RecruiterPage = () => {
  const { token } = useAuth();
  const [onlyBooked, setOnlyBooked] = useState(true);
  const [cvError, setCvError] = useState('');
  const schedule = useQuery({ queryKey: ['schedule', token], queryFn: () => fetchSchedule(token!), refetchInterval: 60_000 });

  // Un lien simple n'enverrait pas le token : on récupère le PDF, puis on l'ouvre.
  const openCv = async (bookingId: string) => {
    setCvError('');
    const tab = window.open('', '_blank');
    try {
      const blob = await fetchBookingCv(bookingId, token!);
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (error) {
      tab?.close();
      setCvError(errorMessage(error));
    }
  };

  if (schedule.isPending) {
    return (
      <p className="status" role="status">
        Chargement…
      </p>
    );
  }
  if (schedule.isError) {
    return (
      <div className="error" role="alert">
        {errorMessage(schedule.error)}
      </div>
    );
  }

  const { data } = schedule;
  const booked = data.slots.reduce((sum, slot) => sum + slot.bookings.length, 0);
  const slots = onlyBooked ? data.slots.filter((slot) => slot.bookings.length > 0) : data.slots;

  return (
    <section className="page">
      <h2>
        Planning de {data.name}
        {data.stand && <span className="muted"> · stand {data.stand}</span>}
      </h2>
      <p>
        {booked === 0 ? 'Aucun rendez-vous réservé pour l’instant.' : `${booked} rendez-vous réservé${booked > 1 ? 's' : ''}.`} Les élèves sans
        rendez-vous peuvent passer au stand à tout moment.
      </p>

      <label className="checkbox">
        <input type="checkbox" checked={onlyBooked} onChange={(e) => setOnlyBooked(e.target.checked)} /> Seulement les créneaux réservés
      </label>

      {cvError && (
        <div className="error" role="alert">
          {cvError}
        </div>
      )}

      <table className="table">
        <thead>
          <tr>
            <th scope="col">Créneau</th>
            <th scope="col">Élève</th>
            <th scope="col">Année</th>
            <th scope="col">CV</th>
          </tr>
        </thead>
        <tbody>
          {slots.flatMap((slot) =>
            slot.bookings.length === 0
              ? [
                  <tr key={slot.id} className="free-row">
                    <td>{formatSlot(slot.startsAt, slot.endsAt)}</td>
                    <td colSpan={3} className="muted">
                      Libre
                    </td>
                  </tr>,
                ]
              : slot.bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{formatSlot(slot.startsAt, slot.endsAt)}</td>
                    <td>
                      {booking.student.name}
                      <br />
                      <a className="muted" href={`mailto:${booking.student.email}`}>
                        {booking.student.email}
                      </a>
                    </td>
                    <td>{yearLabel(booking.student.year)}</td>
                    <td>
                      {booking.student.hasCv ? (
                        <button type="button" className="link-button" onClick={() => void openCv(booking.id)}>
                          Voir le CV
                        </button>
                      ) : (
                        <span className="muted">Pas de CV</span>
                      )}
                    </td>
                  </tr>
                )),
          )}
        </tbody>
      </table>
    </section>
  );
};
