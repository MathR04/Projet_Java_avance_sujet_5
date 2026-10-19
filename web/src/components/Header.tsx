import { NavLink, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';

/**
 * Le haut de chaque page : les liens changent avec le rôle de la personne connectée.
 * Le catalogue reste visible pour tous, même pour un recruteur ou l'équipe.
 */
export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="app-header">
      <div>
        <h1 className="app-title">
          <NavLink to="/">Forum entreprises</NavLink>
        </h1>
        <p className="app-tagline">École d’ingénieurs de Castelmont</p>
      </div>

      <nav className="app-nav" aria-label="Navigation principale">
        <NavLink to="/" end>
          Entreprises
        </NavLink>
        {user?.role === 'STUDENT' && <NavLink to="/me">Mes rendez-vous</NavLink>}
        {user?.role === 'RECRUITER' && <NavLink to="/recruiter">Mon planning</NavLink>}
        {user?.role === 'STAFF' && <NavLink to="/admin">Tableau de bord</NavLink>}
        {user ? (
          <>
            <span className="app-user">{user.name}</span>
            <button type="button" className="link-button" onClick={handleLogout}>
              Se déconnecter
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login">Se connecter</NavLink>
            <NavLink to="/register">Créer un compte élève</NavLink>
          </>
        )}
      </nav>
    </header>
  );
};
