import { BadRequestException, ForbiddenException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import type { JwtPayload } from '../auth/auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const MAX_CV_BYTES = 2 * 1024 * 1024;

/** Ce que multer donne d'un fichier envoyé, réduit à ce qui sert ici. */
export interface UploadedPdf {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface CvFile {
  filename: string;
  content: Buffer;
}

/**
 * Le CV d'un élève. Réponse 7 de Léo : « certaines entreprises veulent voir le
 * CV d'un élève avant de le rencontrer. Seulement celui des élèves qui viennent
 * les voir, pas les autres. » Un recruteur ne lit donc que le CV d'un élève qui
 * a réservé un créneau sur son stand.
 *
 * CHOIX : un seul CV par élève, déposé une fois, et pas un par rendez-vous.
 * CHOIX : l'équipe ne lit pas les CV : elle n'en a pas besoin, et la règle de
 * Léo dit « seulement » les entreprises visitées.
 * CHOIX : un élève qui annule son rendez-vous retire du même coup l'accès à son
 * CV, puisque l'accès se vérifie par la réservation, à chaque lecture.
 */
@Injectable()
export class CvService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(studentId: string, file: UploadedPdf | undefined): Promise<{ filename: string; size: number }> {
    if (!file) throw new BadRequestException('Aucun fichier : envoyez le CV dans le champ « cv »');
    if (file.size > MAX_CV_BYTES) throw new PayloadTooLargeException('Le CV dépasse 2 Mo');
    // CHOIX : PDF seulement, 2 Mo au plus : un format que tout recruteur ouvre.
    // Le type annoncé par le navigateur ne prouve rien : un vrai PDF commence
    // par les octets « %PDF », on les vérifie.
    if (file.mimetype !== 'application/pdf' || file.buffer.subarray(0, 4).toString('latin1') !== '%PDF') {
      throw new BadRequestException('Le CV doit être un PDF');
    }
    // Le nom du fichier est recopié dans l'en-tête de la réponse : on n'y garde
    // que des caractères sans risque.
    const filename = file.originalname.replace(/[^\w.\- ]/g, '_').slice(0, 100) || 'cv.pdf';
    await this.prisma.user.update({
      where: { id: studentId },
      data: { cv: new Uint8Array(file.buffer), cvFilename: filename },
    });
    return { filename, size: file.size };
  }

  async info(studentId: string): Promise<{ filename: string | null }> {
    const user = await this.prisma.user.findUnique({ where: { id: studentId }, select: { cvFilename: true } });
    return { filename: user?.cvFilename ?? null };
  }

  async own(studentId: string): Promise<CvFile> {
    return this.read(studentId);
  }

  async remove(studentId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: studentId }, data: { cv: null, cvFilename: null } });
  }

  /** Le CV de l'élève d'un rendez-vous, pour un recruteur de cette entreprise et lui seul. */
  async forBooking(user: JwtPayload, bookingId: string): Promise<CvFile> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException(`Rendez-vous ${bookingId} introuvable`);
    if (user.role !== 'RECRUITER' || user.companyId !== booking.companyId) {
      throw new ForbiddenException('Seuls les recruteurs de cette entreprise voient ce CV');
    }
    return this.read(booking.studentId);
  }

  private async read(studentId: string): Promise<CvFile> {
    const user = await this.prisma.user.findUnique({ where: { id: studentId }, select: { cv: true, cvFilename: true } });
    if (!user?.cv) throw new NotFoundException('Pas de CV déposé');
    return { filename: user.cvFilename ?? 'cv.pdf', content: Buffer.from(user.cv) };
  }
}
