# Forum entreprises de Castelmont

Sujet 5 du projet de Développement Web, ISMIN 3A. Le client : Léo, président du forum entreprises ([le fil du sujet](https://github.com/gaetanmaisse/ismin-web-2026-tps/discussions/16)).

**Le problème** : à 10 h, 40 élèves font la queue devant un grand groupe, pendant que des PME n'ont vu personne à midi. Les élèves découvrent les entreprises en arrivant.

**Les trois fonctionnalités :**

1. **Le catalogue avant le forum** : les entreprises, leurs offres de stage et leurs places libres, sans compte. L'équipe saisit les offres à partir des mails.
2. **Les rendez-vous** : l'élève réserve un créneau de 20 minutes sur un stand. Les 2A et 3A d'abord, puis l'équipe ouvre aux 1A. Il dépose son CV, que seules les entreprises chez qui il a réservé peuvent lire.
3. **Le jour J** : le recruteur voit qui il reçoit et quand. L'équipe voit le remplissage de chaque stand, et repère ceux qui restent vides le matin.

Les stands restent ouverts à tous : les rendez-vous viennent en plus.

## Démarrer

```sh
docker compose up --build
```

- Le front : http://localhost:8080
- L'API : http://localhost:3000, avec sa documentation sur http://localhost:3000/docs
- `GET http://localhost:3000/health` répond `200`

La base SQLite vit dans un volume Docker et survit à `docker compose down`. Pour repartir de zéro : `docker compose down -v`.

## Les comptes de démonstration

Ils sont créés au premier démarrage, avec six entreprises fictives et leurs offres.

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Équipe du forum | `equipe@forum.castelmont.fr` | `forum2026` |
| Recruteur (Provence Capteurs) | `recruteur@provence-capteurs.example` | `recruteur2026` |
| Élève de 2A | `camille@etu.castelmont.fr` | `eleve2026` |
| Élève de 1A | `lucas@etu.castelmont.fr` | `eleve2026` |

Un élève peut aussi créer son compte depuis le front. Un recruteur, non : l'équipe le crée sur la page de son entreprise, et le mot de passe s'affiche une seule fois.

## Les tests

```sh
cd api && npm install && npm test   # API : tests e2e sur une base de test recréée à chaque lancement
cd web && npm install && npm test   # front : Vitest et Testing Library, l'API est simulée
```

## Développer sans Docker

```sh
# Terminal 1 : l'API, sur localhost:3000
cd api
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run start:dev

# Terminal 2 : le front, sur localhost:5173
cd web
npm install
npm run dev
```

## Les réglages

Ils se changent par l'environnement, dans `api/.env` ou dans un `.env` à la racine pour Docker :

| Variable | Par défaut | Rôle |
|---|---|---|
| `FORUM_DATE` | `2026-11-19` | Le jour du forum |
| `FORUM_OPENS_AT`, `FORUM_CLOSES_AT` | `09:00`, `17:00` | Les horaires des stands, heure de Paris |
| `SLOT_MINUTES` | `20` | La durée d'un rendez-vous |
| `MAX_BOOKINGS_PER_STUDENT` | `5` | Le nombre maximal de rendez-vous par élève |
| `JWT_SECRET` | une valeur de développement | À changer en production |
| `STAFF_EMAIL`, `STAFF_PASSWORD` | voir plus haut | Le compte de l'équipe |
| `SEED_DEMO` | `true` | Les données de démonstration, sur une base vide seulement |

## Les choix faits pendant le développement

Chaque décision qui n'est pas dictée par le fil du sujet est marquée dans le code par un commentaire `CHOIX :`, avec sa raison. Pour les lister :

```sh
grep -rn "CHOIX" api/src api/prisma web/src docker-compose.yml api/Dockerfile
```

Les références « réponse N » renvoient aux réponses de Léo dans [le fil du sujet](https://github.com/gaetanmaisse/ismin-web-2026-tps/discussions/16).

## La structure

```
api/    NestJS 12, Prisma 7 et SQLite, JWT
  src/auth/        connexion, inscription des élèves, rôles STUDENT, RECRUITER et STAFF
  src/companies/   le catalogue, la saisie des entreprises, des offres et des recruteurs
  src/bookings/    les règles de réservation, le CV, le planning du recruteur
  src/dashboard/   le tableau de bord de l'équipe, l'ouverture aux 1A
  test/            les tests e2e
web/    React 19, React Router, TanStack Query
  src/pages/       une page par route, avec ses tests
```
