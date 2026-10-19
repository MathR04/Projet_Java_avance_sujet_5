/**
 * Le déroulé du forum : un jeudi de novembre, de 9 h à 17 h, dans le gymnase
 * (réponse 3 de Léo). Tout se règle par l'environnement, pour changer la date
 * d'une année à l'autre sans toucher au code.
 */
export interface ForumConfig {
  /** Le jour du forum, AAAA-MM-JJ */
  date: string;
  /** Ouverture et fermeture des stands, HH:MM, heure de Paris */
  opensAt: string;
  closesAt: string;
  /** Décalage de l'heure de Paris ce jour-là : +01:00 en novembre (heure d'hiver) */
  utcOffset: string;
  /** Durée d'un rendez-vous, en minutes */
  slotMinutes: number;
  /** Rendez-vous au plus par élève */
  maxBookingsPerStudent: number;
}

export function forumConfig(): ForumConfig {
  return {
    // CHOIX : le jeudi 19 novembre 2026 par défaut. Léo a seulement dit « un
    // jeudi de novembre » : la vraie date est à lui demander.
    date: process.env.FORUM_DATE ?? '2026-11-19',
    opensAt: process.env.FORUM_OPENS_AT ?? '09:00',
    closesAt: process.env.FORUM_CLOSES_AT ?? '17:00',
    utcOffset: process.env.FORUM_UTC_OFFSET ?? '+01:00',
    // CHOIX : 20 minutes par rendez-vous, soit 24 créneaux par recruteur dans
    // la journée. C'est assez pour présenter un stage et un CV. La durée n'a
    // pas été discutée avec le client.
    slotMinutes: Number(process.env.SLOT_MINUTES ?? 20),
    // CHOIX : 5 rendez-vous au plus par élève. Sans limite, un élève pourrait
    // bloquer des dizaines de créneaux, et on recréerait la queue sous une
    // autre forme. 250 élèves × 5 = 1 250 places demandées au plus, pour
    // environ 30 stands × 24 créneaux × 1 ou 2 recruteurs = 720 à 1 440 places.
    maxBookingsPerStudent: Number(process.env.MAX_BOOKINGS_PER_STUDENT ?? 5),
  };
}

/**
 * Une heure du jour du forum, HH:MM, en Date.
 * Ex. : forumTime(config, '09:00') → 2026-11-19T08:00:00Z (9 h à Paris).
 */
export function forumTime(config: ForumConfig, time: string): Date {
  return new Date(`${config.date}T${time}:00${config.utcOffset}`);
}

/**
 * Les créneaux d'une journée, de l'ouverture à la fermeture, bout à bout.
 * Un dernier créneau qui finirait après la fermeture n'est pas créé.
 *
 * CHOIX : pas de pause déjeuner, les stands restent ouverts toute la journée
 * (réponse 3). Si les recruteurs veulent une pause, il faudra la retirer ici.
 */
export function daySlots(config: ForumConfig): { startsAt: Date; endsAt: Date }[] {
  const slots: { startsAt: Date; endsAt: Date }[] = [];
  const end = forumTime(config, config.closesAt).getTime();
  const step = config.slotMinutes * 60_000;
  for (let start = forumTime(config, config.opensAt).getTime(); start + step <= end; start += step) {
    slots.push({ startsAt: new Date(start), endsAt: new Date(start + step) });
  }
  return slots;
}
