import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Repris du TP4. Un mot de passe n'est jamais stocké : seulement son hash salé,
 * avec scrypt, au format `sel:hash` en hexadécimal. Le sel rend deux mots de
 * passe identiques méconnaissables, et la comparaison en temps constant
 * (timingSafeEqual) ne laisse rien deviner du temps de réponse.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;

  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
