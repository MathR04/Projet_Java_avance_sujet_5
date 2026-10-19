import { Injectable } from '@nestjs/common';
import { forumConfig, forumTime } from '../forum.config.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Ce que l'équipe veut voir : ce qui se passe sur chaque stand, pour repérer
 * ceux qui restent vides. Les deux indicateurs du client : plus de queue de
 * 40 personnes, et plus de PME qui n'a vu personne à midi.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(now = new Date()) {
    // CHOIX : « le matin », ce sont les créneaux qui commencent avant midi.
    // C'est l'indicateur de Léo : « plus aucune PME qui n'a vu personne à midi ».
    const noon = forumTime(forumConfig(), '12:00');
    const [companies, students, settings] = await Promise.all([
      this.prisma.company.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          stand: true,
          recruiterCount: true,
          _count: { select: { offers: true, recruiters: true } },
          slots: { select: { startsAt: true, endsAt: true, capacity: true, _count: { select: { bookings: true } } } },
        },
      }),
      this.prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: { year: true, _count: { select: { bookings: true } } },
      }),
      this.settings(),
    ]);

    const stands = companies
      .map(({ slots, _count, ...company }) => {
        const totalPlaces = slots.reduce((sum, slot) => sum + slot.capacity, 0);
        const booked = slots.reduce((sum, slot) => sum + slot._count.bookings, 0);
        const morning = slots.filter((slot) => slot.startsAt < noon).reduce((sum, slot) => sum + slot._count.bookings, 0);
        // Le créneau en cours, le jour J : combien d'élèves sont attendus en ce moment.
        const current = slots.find((slot) => slot.startsAt <= now && now < slot.endsAt);
        return {
          ...company,
          offers: _count.offers,
          recruiterAccounts: _count.recruiters,
          totalPlaces,
          booked,
          morningBooked: morning,
          fillRate: totalPlaces === 0 ? 0 : booked / totalPlaces,
          bookedNow: current?._count.bookings ?? 0,
        };
      })
      // CHOIX : les stands les moins remplis en premier, ce sont eux qu'il faut
      // signaler aux élèves (réponse 5 : « repérer ceux qui restent vides »).
      .sort((a, b) => a.fillRate - b.fillRate || a.name.localeCompare(b.name));

    const byYear = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
    for (const student of students) if (student.year) byYear[student.year] = (byYear[student.year] ?? 0) + 1;

    return {
      settings,
      totals: {
        companies: companies.length,
        students: students.length,
        studentsByYear: byYear,
        studentsWithBooking: students.filter((student) => student._count.bookings > 0).length,
        bookings: stands.reduce((sum, stand) => sum + stand.booked, 0),
        emptyMorningStands: stands.filter((stand) => stand.morningBooked === 0).length,
      },
      stands,
    };
  }

  /** La ligne des réglages, créée si elle manque encore. */
  settings() {
    return this.prisma.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  }

  updateSettings(openToFirstYears: boolean) {
    return this.prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, openToFirstYears },
      update: { openToFirstYears },
    });
  }
}
