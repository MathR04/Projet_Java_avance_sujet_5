/**
 * Les heures et les dates, toujours à l'heure de Paris, celle du gymnase.
 * CHOIX : le fuseau est fixé, et pas pris sur l'ordinateur de l'utilisateur :
 * un élève en échange à l'étranger voit les mêmes heures que le planning du stand.
 */
const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
const day = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });

export const formatTime = (iso: string) => time.format(new Date(iso));

export const formatSlot = (startsAt: string, endsAt: string) => `${formatTime(startsAt)} – ${formatTime(endsAt)}`;

export const formatDay = (date: string) => day.format(new Date(`${date}T12:00:00`));

export const formatPlaces = (n: number) => (n <= 1 ? `${n} place libre` : `${n} places libres`);

export const yearLabel = (year: number | null | undefined) => (year ? `${year}A` : '');
