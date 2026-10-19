import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../auth/password.js';
import { daySlots, forumConfig } from '../forum.config.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateCompanyDto,
  CreateOfferDto,
  CreateRecruiterDto,
  UpdateCompanyDto,
  UpdateOfferDto,
} from './dto/company.dto.js';

/**
 * Ce que voit un élève d'un créneau : combien de places restent.
 * CHOIX : jamais qui les a prises. Un élève ne voit pas qui d'autre va voir
 * une entreprise ; seul le recruteur le voit (src/bookings/schedule.service.ts).
 */
export interface PublicSlot {
  id: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  booked: number;
}

/** Ce que Prisma charge avec une entreprise : ses offres, et ses créneaux avec leur nombre de réservations. */
const companyInclude = {
  offers: { orderBy: { createdAt: 'asc' } },
  slots: { orderBy: { startsAt: 'asc' }, include: { _count: { select: { bookings: true } } } },
} satisfies Prisma.CompanyInclude;

type CompanyWithSlots = Prisma.CompanyGetPayload<{ include: typeof companyInclude }>;

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Le catalogue : chaque entreprise, ses offres, et ses places libres.
   * CHOIX : sans le détail des créneaux, pour une page d'accueil légère : 30
   * entreprises × 24 créneaux, c'est 720 lignes que personne ne lit en liste.
   * Le tri est fait par le front, qui laisse l'élève choisir.
   */
  async findAll() {
    const companies = await this.prisma.company.findMany({ include: companyInclude, orderBy: { name: 'asc' } });
    return companies.map((company) => {
      const { slots, ...rest } = toPublic(company);
      return { ...rest, ...availability(slots) };
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id }, include: companyInclude });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    const view = toPublic(company);
    return { ...view, ...availability(view.slots) };
  }

  /**
   * Une entreprise arrive avec ses créneaux de la journée, de l'ouverture à la
   * fermeture (src/forum.config.ts), tous en une requête.
   * CHOIX : l'équipe n'a rien à régler, les recruteurs n'ont pas d'espace avant
   * le jour J (réponse 6 de Léo). Tous les stands ont donc les mêmes horaires.
   */
  async create(dto: CreateCompanyDto) {
    const capacity = dto.recruiterCount ?? 1;
    try {
      const company = await this.prisma.company.create({
        data: {
          ...dto,
          recruiterCount: capacity,
          slots: { create: daySlots(forumConfig()).map((slot) => ({ ...slot, capacity })) },
        },
      });
      return this.findOne(company.id);
    } catch (error) {
      throw uniqueName(error, dto.name);
    }
  }

  /**
   * Changer le nombre de recruteurs change la capacité de tous les créneaux du stand.
   * Les deux écritures sont dans une transaction : toutes les deux, ou aucune.
   * CHOIX : passer de 2 recruteurs à 1 n'annule aucun rendez-vous déjà pris.
   * Le créneau reste à 2 élèves, que le recruteur verra l'un après l'autre.
   */
  async update(id: string, dto: UpdateCompanyDto) {
    await this.ensureExists(id);
    try {
      await this.prisma.$transaction([
        this.prisma.company.update({ where: { id }, data: dto }),
        ...(dto.recruiterCount
          ? [this.prisma.slot.updateMany({ where: { companyId: id }, data: { capacity: dto.recruiterCount } })]
          : []),
      ]);
    } catch (error) {
      throw uniqueName(error, dto.name ?? '');
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.company.delete({ where: { id } });
  }

  async addOffer(companyId: string, dto: CreateOfferDto) {
    await this.ensureExists(companyId);
    return this.prisma.offer.create({ data: { ...dto, companyId } });
  }

  async updateOffer(id: string, dto: UpdateOfferDto) {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException(`Offer ${id} not found`);
    return this.prisma.offer.update({ where: { id }, data: dto });
  }

  async removeOffer(id: string): Promise<void> {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException(`Offer ${id} not found`);
    await this.prisma.offer.delete({ where: { id } });
  }

  /**
   * Le matin du forum, l'équipe crée le compte d'un recruteur (réponse 6 de Léo :
   * « le matin du forum, je crée un compte à chaque recruteur »).
   * CHOIX : le mot de passe est tiré au hasard (8 caractères) et rendu une seule
   * fois, dans la réponse : l'équipe le donne au recruteur sur place. Seul son
   * hash est gardé. Pas d'e-mail envoyé : rien à configurer, rien à attendre.
   */
  async addRecruiter(companyId: string, dto: CreateRecruiterDto) {
    await this.ensureExists(companyId);
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException(`An account already exists for ${email}`);
    }
    const password = randomBytes(6).toString('base64url');
    const user = await this.prisma.user.create({
      data: { email, name: dto.name, role: 'RECRUITER', companyId, passwordHash: hashPassword(password) },
    });
    return { id: user.id, email: user.email, name: user.name, companyId, password };
  }

  async recruiters(companyId: string) {
    await this.ensureExists(companyId);
    return this.prisma.user.findMany({
      where: { companyId, role: 'RECRUITER' },
      select: { id: true, email: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const company = await this.prisma.company.findUnique({ where: { id }, select: { id: true } });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
  }
}

/** Remplace la liste des réservations de chaque créneau par leur nombre. */
function toPublic({ slots, ...company }: CompanyWithSlots) {
  return {
    ...company,
    slots: slots.map(
      ({ id, startsAt, endsAt, capacity, _count }): PublicSlot => ({ id, startsAt, endsAt, capacity, booked: _count.bookings }),
    ),
  };
}

/** Les places d'un stand : total, et libres. */
function availability(slots: PublicSlot[]) {
  const totalPlaces = slots.reduce((sum, slot) => sum + slot.capacity, 0);
  const bookedPlaces = slots.reduce((sum, slot) => sum + Math.min(slot.booked, slot.capacity), 0);
  return { totalPlaces, freePlaces: totalPlaces - bookedPlaces };
}

/** P2002 : la contrainte unique sur le nom. Un 409 plutôt qu'une erreur 500. */
function uniqueName(error: unknown, name: string): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return new ConflictException(`A company named ${name} already exists`);
  }
  return error;
}
