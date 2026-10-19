import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ApiError, errorMessage } from '../api';
import { useAuth } from '../auth/AuthProvider';
import type { Role } from '../auth/jwt';

/**
 * Où va chacun une fois connecté, quand il ne venait pas d'une page précise.
 * CHOIX : le recruteur arrive directement sur son planning, l'équipe sur son
 * tableau de bord : c'est la seule page dont ils ont besoin le jour J.
 */
export const HOME: Record<Role, string> = { STUDENT: '/', RECRUITER: '/recruiter', STAFF: '/admin' };

/** Une seule page de connexion pour les trois rôles : le rôle vient du token. */
export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      navigate(from ?? HOME[user?.role ?? 'STUDENT'], { replace: true });
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'E-mail ou mot de passe incorrect.' : errorMessage(err));
    }
  };

  return (
    <section className="page form-page">
      <h2>Connexion</h2>

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="login-email">E-mail</label>
          <input id="login-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="login-password">Mot de passe</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <button className="button" type="submit">
          Se connecter
        </button>
      </form>

      <p className="hint">
        Élève sans compte&nbsp;? <Link to="/register">Créez-le</Link>. Recruteurs&nbsp;: l’équipe du forum vous donne vos identifiants à votre arrivée.
      </p>
    </section>
  );
};
