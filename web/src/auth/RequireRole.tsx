import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';
import type { Role } from './jwt';

/**
 * Garde une page d’un rôle : /me pour l’élève, /recruiter, /admin.
 * Déconnecté : direction /login, qui reviendra ici ensuite.
 * Connecté avec un autre rôle : un message, pas la page. L'API refuse de
 * toute façon : ce garde évite seulement d'afficher une page vide.
 */
export const RequireRole = ({ role, children }: { role: Role; children: ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) {
    return (
      <section className="page">
        <div className="error" role="alert">
          Cette page n’est pas accessible avec votre compte.
        </div>
      </section>
    );
  }
  return children;
};
