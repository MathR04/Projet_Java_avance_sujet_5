import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Le planning d'un stand : qui le recruteur voit, et quand (réponse 5 de Léo :
 * « le recruteur veut savoir qui il voit, et quand »).
 *
 * CHOIX : le recruteur voit le nom, l'e-mail et l'année de l'élève, et s'il a
 * un CV. L'année l'aide à savoir s'il parle à un 1A curieux ou à un 3A qui
 * cherche son stage de fin d'études.
 */
@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async forCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        stand: true,
        slots: {
          orderBy: { startsAt: 'asc' },
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            capacity: true,
            bookings: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                student: { select: { name: true, email: true, year: true, cvFilename: true } },
              },
            },
          },
        },
      },
    });
    if (!company) throw new NotFoundException('Ce compte n’est rattaché à aucune entreprise');

    return {
      ...company,
      slots: company.slots.map((slot) => ({
        ...slot,
        bookings: slot.bookings.map(({ id, student: { cvFilename, ...student } }) => ({
          id,
          student: { ...student, hasCv: cvFilename !== null },
        })),
      })),
    };
  }
}
