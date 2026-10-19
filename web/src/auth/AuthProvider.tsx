import { createContext, useContext, useState, type ReactNode } from 'react';
import * as api from '../api';
import { decodePayload, type JwtPayload } from './jwt';

/** Où le token est gardé : DevTools → Application → Local Storage, sous cette clé. */
export const TOKEN_KEY = 'token';

export interface Auth {
  /** Le token brut, pour l'en-tête Authorization. null : déconnecté. */
  token: string | null;
  /** Qui est connecté, lu dans le token. null : déconnecté, ou token expiré. */
  user: JwtPayload | null;
  /** Rend qui vient de se connecter. Laisse passer l'ApiError : 401 pour un mauvais mot de passe. */
  login: (email: string, password: string) => Promise<JwtPayload | null>;
  /** L'inscription d'un élève, qui le connecte aussitôt. */
  register: (registration: api.Registration) => Promise<JwtPayload | null>;
  logout: () => void;
}

const AuthContext = createContext<Auth | null>(null);

/**
 * L'utilisateur connecté, pour toute l'application. Le token vit dans un state,
 * pour que React redessine la page quand il change, et dans localStorage, pour
 * survivre à un rechargement.
 *
 * CHOIX : localStorage, comme au TP9, plutôt qu'un cookie httpOnly. Un script
 * injecté dans la page pourrait lire le token ; un cookie l'en empêcherait,
 * mais demanderait de gérer CSRF côté API. React échappe ce qu'il affiche, ce
 * qui limite le risque.
 * CHOIX : un token expiré compte comme une déconnexion (decodePayload rend null) :
 * le front n'affiche pas « connecté » à quelqu'un que l'API refusera.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const user = token !== null ? decodePayload(token) : null;

  const keep = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem(TOKEN_KEY, newToken);
    return decodePayload(newToken);
  };

  const value: Auth = {
    token: user ? token : null,
    user,
    login: async (email, password) => keep(await api.login(email, password)),
    register: async (registration) => keep(await api.register(registration)),
    logout: () => {
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): Auth => {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>');
  return auth;
};
