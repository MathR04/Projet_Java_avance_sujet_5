/**
 * Remplit la base au démarrage. Le relancer ne change rien.
 *
 *   - le compte de l'équipe du forum, toujours
 *   - avec SEED_DEMO=true (par défaut), et seulement sur une base sans
 *     entreprise : des entreprises fictives, leurs offres, un recruteur et
 *     deux élèves, pour essayer chaque rôle tout de suite
 *
 *   npm run db:seed
 */
import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { hashPassword } from '../src/auth/password.js';
import { daySlots, forumConfig } from '../src/forum.config.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

interface CompanySeed {
  name: string;
  description: string;
  stand: string;
  recruiterCount: number;
  offers: { title: string; duration: string; location?: string; description?: string }[];
}

// CHOIX : des entreprises fictives, comme l'école. Un grand groupe, une ESN et
// quatre PME : de quoi voir le tri par places libres et les stands vides.
const COMPANIES: CompanySeed[] = [
  {
    name: 'Valmont Semiconducteurs',
    description: 'Grand groupe européen de semi-conducteurs, 40 000 personnes, dont 2 000 en Provence.',
    stand: 'A1',
    recruiterCount: 2,
    offers: [
      { title: 'Ingénieur·e vérification numérique', duration: '6 mois', location: 'Rousset' },
      { title: 'Caractérisation de transistors de puissance', duration: '6 mois', location: 'Rousset' },
      { title: 'Data engineer, rendement de fabrication', duration: '5 à 6 mois', location: 'Grenoble' },
    ],
  },
  {
    name: 'Provence Capteurs',
    description: 'PME de 45 personnes : capteurs MEMS pour l’automobile et le médical, conçus et testés à Aix.',
    stand: 'B4',
    recruiterCount: 1,
    offers: [
      {
        title: 'Conception d’un banc de test de capteurs de pression',
        duration: '6 mois',
        location: 'Aix-en-Provence',
        description: 'Du cahier des charges au banc qui tourne : électronique, firmware et Python. Vous serez seul·e sur le projet, avec un tuteur à côté.',
      },
      { title: 'Stage ouvrier en salle de test', duration: '1 à 2 mois', location: 'Aix-en-Provence' },
    ],
  },
  {
    name: 'Calanques Embarqué',
    description: 'Start-up de 12 personnes : traceurs GPS basse consommation pour la plaisance.',
    stand: 'B7',
    recruiterCount: 1,
    offers: [
      { title: 'Firmware Rust sur microcontrôleur ARM', duration: '6 mois', location: 'Marseille' },
      { title: 'Application mobile de suivi de bateaux', duration: '3 à 4 mois', location: 'Marseille' },
    ],
  },
  {
    name: 'Atelier Lumen',
    description: 'PME d’optique de précision, 30 personnes, fournisseur des télescopes de l’Observatoire.',
    stand: 'C2',
    recruiterCount: 1,
    offers: [{ title: 'Traitement d’images pour le contrôle qualité de lentilles', duration: '5 mois', location: 'Manosque' }],
  },
  {
    name: 'Sudnet Services',
    description: 'ESN de 2 500 personnes, agences à Marseille, Nice et Montpellier.',
    stand: 'A3',
    recruiterCount: 2,
    offers: [
      { title: 'Développeur·se full-stack TypeScript', duration: '6 mois', location: 'Marseille' },
      { title: 'DevOps, migration vers Kubernetes', duration: '6 mois', location: 'Montpellier' },
    ],
  },
  {
    name: 'Mistral Énergie',
    description: 'PME de 60 personnes : électronique de puissance pour onduleurs solaires.',
    stand: 'C5',
    recruiterCount: 1,
    offers: [
      { title: 'Conception d’une carte de commande d’onduleur', duration: '6 mois', location: 'Toulon' },
      { title: 'Stage assistant ingénieur, tests CEM', duration: '2 à 3 mois', location: 'Toulon' },
    ],
  },
];

async function main(): Promise<void> {
  const staffEmail = (process.env.STAFF_EMAIL ?? 'equipe@forum.castelmont.fr').toLowerCase();
  const staffPassword = process.env.STAFF_PASSWORD ?? 'forum2026';
  await prisma.user.upsert({
    where: { email: staffEmail },
    create: { email: staffEmail, name: 'Équipe du forum', role: 'STAFF', passwordHash: hashPassword(staffPassword) },
    update: {},
  });
  await prisma.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });

  // CHOIX : la démonstration n'est créée que sur une base sans entreprise :
  // une fois que l'équipe a saisi les vraies, un redémarrage ne les mélange pas
  // avec les fausses. Pour le vrai forum : SEED_DEMO=false.
  const demo = (process.env.SEED_DEMO ?? 'true') === 'true';
  if (!demo || (await prisma.company.count()) > 0) {
    console.log(`✅ compte équipe ${staffEmail}, pas de données de démonstration`);
    return;
  }

  const slots = daySlots(forumConfig());
  for (const { offers, ...company } of COMPANIES) {
    await prisma.company.create({
      data: {
        ...company,
        offers: { create: offers },
        slots: { create: slots.map((slot) => ({ ...slot, capacity: company.recruiterCount })) },
      },
    });
  }

  const pme = await prisma.company.findUniqueOrThrow({ where: { name: 'Provence Capteurs' } });
  const demoUsers = [
    { email: 'recruteur@provence-capteurs.example', name: 'Sophie Durand', role: 'RECRUITER', companyId: pme.id, password: 'recruteur2026' },
    { email: 'camille@etu.castelmont.fr', name: 'Camille Martin', role: 'STUDENT', year: 2, password: 'eleve2026' },
    { email: 'lucas@etu.castelmont.fr', name: 'Lucas Bernard', role: 'STUDENT', year: 1, password: 'eleve2026' },
  ];
  for (const { password, ...user } of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: { ...user, passwordHash: hashPassword(password) },
      update: {},
    });
  }

  console.log(`✅ compte équipe ${staffEmail}, ${COMPANIES.length} entreprises, ${demoUsers.length} comptes de démonstration`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
