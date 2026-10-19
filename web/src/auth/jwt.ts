export type Role = 'STUDENT' | 'RECRUITER' | 'STAFF';

/** Ce que porte le token de l'API : les champs de `JwtPayload` côté API, plus les dates. */
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  year?: number | null;
  companyId?: string | null;
  /** Émis le, en secondes depuis 1970 */
  iat: number;
  /** Expire le, en secondes depuis 1970 */
  exp: number;
}

/**
 * Lit le contenu d'un JWT, la partie entre les deux points, ou null s'il est
 * illisible ou expiré. Le contenu n'est pas secret : il est encodé, pas chiffré.
 * Le front s'en sert pour afficher qui est connecté, jamais pour autoriser :
 * l'API vérifie la signature à chaque requête.
 */
export function decodePayload(token: string, now = Date.now()): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // atob donne des octets : on les relit en UTF-8, pour les accents des noms.
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const decoded = JSON.parse(new TextDecoder().decode(bytes)) as JwtPayload;
    if (decoded.exp && decoded.exp * 1000 < now) return null;
    return decoded;
  } catch {
    return null;
  }
}
