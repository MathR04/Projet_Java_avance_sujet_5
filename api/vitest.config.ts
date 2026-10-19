import { defineConfig } from 'vitest/config';

/**
 * Les tests tournent sur leur propre base, `test.db`, recréée à chaque lancement.
 * Tout l'environnement est ici : `npm test` marche sur un clone neuf, sans `.env`.
 * Le forum est daté en 2099 : ses créneaux restent dans le futur.
 */
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*spec.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'test-secret',
      FORUM_DATE: '2099-11-19',
      FORUM_OPENS_AT: '09:00',
      FORUM_CLOSES_AT: '17:00',
      FORUM_UTC_OFFSET: '+01:00',
      SLOT_MINUTES: '20',
      MAX_BOOKINGS_PER_STUDENT: '3',
    },
    globalSetup: ['test/global-setup.ts'],
  },
});
