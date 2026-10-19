/**
 * Les trois rôles du forum, la seule liste de référence côté API.
 *
 *   STUDENT    un élève : consulte le catalogue, réserve, dépose son CV
 *   RECRUITER  un recruteur : consulte le planning de son stand et les CV
 *   STAFF      l'équipe du forum : saisit les entreprises, suit les stands
 *
 * Pas d'administrateur à part : l'équipe, c'est l'admin (réponse 2 de Léo).
 */
export const ROLES = ['STUDENT', 'RECRUITER', 'STAFF'] as const;
export type Role = (typeof ROLES)[number];
