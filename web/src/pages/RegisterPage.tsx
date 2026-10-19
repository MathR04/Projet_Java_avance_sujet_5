import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ApiError } from '../api';
import { useAuth } from '../auth/AuthProvider';

/** L'inscription d'un élève. L'année compte : les 2A et 3A réservent en premier. */
export const RegisterPage = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', year: '' });
  const [errors, setErrors] = useState<string[]>([]);
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (field: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [field]: event.target.value });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors([]);
    try {
      await register({ ...form, year: Number(form.year) });
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setErrors(['Un compte existe déjà avec cet e-mail.']);
      else if (err instanceof ApiError && err.details.length > 0) setErrors(err.details);
      else setErrors(['L’inscription a échoué, réessayez.']);
    }
  };

  return (
    <section className="page form-page">
      <h2>Créer un compte élève</h2>

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="register-name">Prénom et nom</label>
          <input id="register-name" autoComplete="name" required value={form.name} onChange={set('name')} />
        </div>
        <div className="field">
          <label htmlFor="register-email">E-mail</label>
          <input id="register-email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        </div>
        <div className="field">
          <label htmlFor="register-password">Mot de passe</label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={form.password}
            onChange={set('password')}
          />
          <p className="field-hint">8 caractères au moins.</p>
        </div>
        <div className="field">
          <label htmlFor="register-year">Année</label>
          <select id="register-year" required value={form.year} onChange={set('year')}>
            <option value="" disabled>
              Choisir…
            </option>
            <option value="1">1A</option>
            <option value="2">2A</option>
            <option value="3">3A</option>
          </select>
        </div>
        {errors.length > 0 && (
          <div className="error" role="alert">
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        <button className="button" type="submit">
          Créer mon compte
        </button>
      </form>
    </section>
  );
};
