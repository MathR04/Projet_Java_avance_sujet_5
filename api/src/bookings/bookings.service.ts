import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { forumConfig } from '../forum.config.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Les règles d'une réservation, toutes ici, dans l'ordre où elles sont vérifiées :
 *   1. seul un élève réserve
 *   2. les 2A et 3A d'abord : un 1A attend que l'équipe ouvre les réservations
 *   3. pas de réservation d'un créneau déjà commencé
 *   4. un créneau ne prend pas plus d'élèves que de recruteurs sur le stand
 *   5. un seul rendez-vous par entreprise
 *   6. au plus `maxBookingsPerStudent` rendez-vous (5 par défaut)
 *   7. jamais deux rendez-vous à la même heure
 *
 * Chaque refus est un 403 (règles 1 et 2 : pas le droit) ou un 409 (règles 3 à 7 :
 * conflit avec l'état actuel), avec un message que le front affiche tel quel.
 *
 * CHOIX : les messages d'erreur métier sont en français, côté API. Le front n'a
 * pas à traduire chaque cas, et Swagger les montre comme l'élève les verra.
 */
@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** `now` en paramètre : les tests peuvent fixer l'heure. */
  async book(studentId: string, slotId: string, now = new Date()) {
    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!student || student.role !== 'STUDENT') throw new ForbiddenException('Seuls les élèves réservent');

    // CHOIX : un 1A est refusé tant que l'équipe n'a pas ouvert (réponse 7 :
    // « les 1A sont les bienvenus, mais les 2A et les 3A passent d'abord »),
    // plutôt qu'un quota de places réservées aux 2A et 3A : plus simple à
    // expliquer, et l'équipe choisit le moment.
    if (student.year === 1) {
      const settings = await this.prisma.settings.findUnique({ where: { id: 1 } });
      if (!settings?.openToFirstYears) {
        throw new ForbiddenException(
          'Les 2A et 3A réservent en premier : les réservations ouvriront bientôt aux 1A. Les stands restent ouverts à tous le jour J.',
        );
      }
    }

    // Tout dans une transaction : entre la lecture des places et la création de la
    // réservation, personne d'autre ne réserve la dernière place.
    try {
      return await this.prisma.$transaction(async (tx) => {
        const slot = await tx.slot.findUnique({
          where: { id: slotId },
          include: { _count: { select: { bookings: true } }, company: { select: { name: true } } },
        });
        if (!slot) throw new NotFoundException(`Créneau ${slotId} introuvable`);
        if (slot.startsAt <= now) throw new ConflictException('Ce créneau est déjà passé');
        if (slot._count.bookings >= slot.capacity) throw new ConflictException('Ce créneau est complet');

        // CHOIX : un seul rendez-vous par entreprise. Deux créneaux chez le même
        // grand groupe, c'est une place de moins pour un autre élève.
        const mine = await tx.booking.findMany({ where: { studentId }, include: { slot: true } });
        if (mine.some((booking) => booking.companyId === slot.companyId)) {
          throw new ConflictException(`Vous avez déjà un rendez-vous avec ${slot.company.name}`);
        }
        const { maxBookingsPerStudent } = forumConfig();
        if (mine.length >= maxBookingsPerStudent) {
          throw new ConflictException(`Vous avez déjà ${maxBookingsPerStudent} rendez-vous, le maximum`);
        }
        // Deux intervalles se chevauchent si chacun commence avant la fin de l'autre.
        const overlapping = mine.find((booking) => booking.slot.startsAt < slot.endsAt && slot.startsAt < booking.slot.endsAt);
        if (overlapping) throw new ConflictException('Vous avez déjà un rendez-vous à cette heure-là');

        return tx.booking.create({
          data: { slotId, studentId, companyId: slot.companyId },
          include: bookingView,
        });
      });
    } catch (error) {
      // Deux clics en même temps : la contrainte unique de la base tranche.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Vous avez déjà un rendez-vous avec cette entreprise');
      }
      throw error;
    }
  }

  mine(studentId: string) {
    return this.prisma.booking.findMany({
      where: { studentId },
      include: bookingView,
      orderBy: { slot: { startsAt: 'asc' } },
    });
  }

  /**
   * CHOIX : un élève annule librement, jusqu'au dernier moment, et la place
   * revient aussitôt au catalogue. Pas de pénalité : rien dans le fil ne le demande.
   */
  async cancel(studentId: string, id: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    // Le rendez-vous d'un autre : 404, pour ne pas dire qu'il existe.
    if (!booking || booking.studentId !== studentId) throw new NotFoundException(`Rendez-vous ${id} introuvable`);
    await this.prisma.booking.delete({ where: { id } });
  }
}

/** Ce que l'élève voit d'un rendez-vous : l'heure, et l'entreprise avec son stand. */
const bookingView = {
  slot: {
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      company: { select: { id: true, name: true, stand: true } },
    },
  },
} satisfies Prisma.BookingInclude;
