import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  createCompany,
  createOffer,
  createRecruiter,
  deleteCompany,
  deleteOffer,
  errorMessage,
  fetchCompany,
  fetchRecruiters,
  updateCompany,
} from '../api';
import { useAuth } from '../auth/AuthProvider';
import type { CompanyDetail, CompanyInput } from '../types';

/**
 * L'équipe saisit une entreprise à partir de son mail : le stand, les offres,
 * puis, le matin du forum, les comptes de ses recruteurs (réponse 6 de Léo).
 * À /admin/companies/new, le formulaire crée l'entreprise, avec ses créneaux.
 *
 * CHOIX : une seule page par entreprise, avec trois formulaires (l'entreprise,
 * ses offres, ses recruteurs), plutôt qu'une page par formulaire : la saisie
 * d'un mail se fait d'un bout à l'autre sans changer de page.
 */
export const AdminCompanyPage = () => {
  const { id = 'new' } = useParams();
  const { token } = useAuth();
  const isNew = id === 'new';
  const company = useQuery({ queryKey: ['company', id], queryFn: () => fetchCompany(id), enabled: !isNew });

  if (isNew) {
    return (
      <section className="page form-page wide">
        <Link className="back" to="/admin">
          ← Tableau de bord
        </Link>
        <h2>Nouvelle entreprise</h2>
        <CompanyForm token={token!} />
      </section>
    );
  }
  if (company.isPending) {
    return (
      <p className="status" role="status">
        Chargement…
      </p>
    );
  }
  if (company.isError) {
    return (
      <div className="error" role="alert">
        {errorMessage(company.error)}
      </div>
    );
  }

  return (
    <section className="page form-page wide">
      <Link className="back" to="/admin">
        ← Tableau de bord
      </Link>
      <h2>{company.data.name}</h2>
      <CompanyForm token={token!} company={company.data} />
      <Offers token={token!} company={company.data} />
      <Recruiters token={token!} companyId={company.data.id} />
      <DeleteCompany token={token!} company={company.data} />
    </section>
  );
};

const CompanyForm = ({ token, company }: { token: string; company?: CompanyDetail }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: company?.name ?? '',
    stand: company?.stand ?? '',
    website: company?.website ?? '',
    description: company?.description ?? '',
    recruiterCount: String(company?.recruiterCount ?? 1),
  });
  const [saved, setSaved] = useState(false);
  const set = (field: keyof typeof form) => (event: { target: { value: string } }) => {
    setSaved(false);
    setForm({ ...form, [field]: event.target.value });
  };

  const save = useMutation({
    mutationFn: () => {
      const input: CompanyInput = {
        name: form.name,
        description: form.description,
        recruiterCount: Number(form.recruiterCount),
        ...(form.stand ? { stand: form.stand } : {}),
        ...(form.website ? { website: form.website } : {}),
      };
      return company ? updateCompany(company.id, input, token) : createCompany(input, token);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.setQueryData(['company', result.id], result);
      if (company) setSaved(true);
      else navigate(`/admin/companies/${result.id}`, { replace: true });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <form className="form" onSubmit={handleSubmit} aria-label="Entreprise">
      <div className="field">
        <label htmlFor="company-name">Nom</label>
        <input id="company-name" required value={form.name} onChange={set('name')} />
      </div>
      <div className="field">
        <label htmlFor="company-stand">Stand</label>
        <input id="company-stand" placeholder="B4" value={form.stand} onChange={set('stand')} />
      </div>
      <div className="field">
        <label htmlFor="company-recruiters">Recruteurs sur le stand</label>
        <select id="company-recruiters" value={form.recruiterCount} onChange={set('recruiterCount')}>
          <option value="1">1 : un élève par créneau</option>
          <option value="2">2 : deux élèves par créneau</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="company-website">Site web</label>
        <input id="company-website" type="url" placeholder="https://…" value={form.website} onChange={set('website')} />
      </div>
      <div className="field full">
        <label htmlFor="company-description">Présentation</label>
        <textarea id="company-description" rows={3} value={form.description} onChange={set('description')} />
      </div>
      {save.isError && (
        <div className="error form-error" role="alert">
          {errorMessage(save.error)}
        </div>
      )}
      {saved && (
        <p className="success form-error" role="status">
          Enregistré.
        </p>
      )}
      <button className="button" type="submit" disabled={save.isPending}>
        {company ? 'Enregistrer' : 'Créer l’entreprise et ses créneaux'}
      </button>
    </form>
  );
};

const Offers = ({ token, company }: { token: string; company: CompanyDetail }) => {
  const queryClient = useQueryClient();
  const empty = { title: '', duration: '', location: '', description: '' };
  const [form, setForm] = useState(empty);
  const set = (field: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [field]: event.target.value });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['company', company.id] });
    void queryClient.invalidateQueries({ queryKey: ['companies'] });
  };

  const add = useMutation({
    mutationFn: () =>
      createOffer(
        company.id,
        { title: form.title, duration: form.duration, description: form.description, ...(form.location ? { location: form.location } : {}) },
        token,
      ),
    onSuccess: () => {
      setForm(empty);
      refresh();
    },
  });
  const remove = useMutation({ mutationFn: (id: string) => deleteOffer(id, token), onSuccess: refresh });

  return (
    <section>
      <h3>Offres de stage</h3>
      {company.offers.length === 0 && <p className="empty">Aucune offre saisie.</p>}
      <ul className="offers">
        {company.offers.map((offer) => (
          <li key={offer.id} className="offer">
            <h4>{offer.title}</h4>
            <p className="muted">
              {offer.duration}
              {offer.location ? ` · ${offer.location}` : ''}
            </p>
            <button type="button" className="link-button" aria-label={`Supprimer l’offre ${offer.title}`} onClick={() => remove.mutate(offer.id)}>
              Supprimer
            </button>
          </li>
        ))}
      </ul>

      <form
        className="form"
        aria-label="Nouvelle offre"
        onSubmit={(event) => {
          event.preventDefault();
          add.mutate();
        }}
      >
        <div className="field">
          <label htmlFor="offer-title">Intitulé</label>
          <input id="offer-title" required value={form.title} onChange={set('title')} />
        </div>
        <div className="field">
          <label htmlFor="offer-duration">Durée</label>
          <input id="offer-duration" required placeholder="6 mois" value={form.duration} onChange={set('duration')} />
        </div>
        <div className="field">
          <label htmlFor="offer-location">Lieu</label>
          <input id="offer-location" value={form.location} onChange={set('location')} />
        </div>
        <div className="field full">
          <label htmlFor="offer-description">Description</label>
          <textarea id="offer-description" rows={3} value={form.description} onChange={set('description')} />
        </div>
        {add.isError && (
          <div className="error form-error" role="alert">
            {errorMessage(add.error)}
          </div>
        )}
        <button className="button" type="submit" disabled={add.isPending}>
          Ajouter l’offre
        </button>
      </form>
    </section>
  );
};

const Recruiters = ({ token, companyId }: { token: string; companyId: string }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '' });
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const recruiters = useQuery({ queryKey: ['recruiters', companyId], queryFn: () => fetchRecruiters(companyId, token) });

  const add = useMutation({
    mutationFn: () => createRecruiter(companyId, form, token),
    onSuccess: (recruiter) => {
      setCreated({ email: recruiter.email, password: recruiter.password });
      setForm({ name: '', email: '' });
      void queryClient.invalidateQueries({ queryKey: ['recruiters', companyId] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <section>
      <h3>Comptes recruteurs</h3>
      <p className="muted">À créer le matin du forum : le recruteur consulte son planning sur place.</p>
      <ul>
        {recruiters.data?.map((recruiter) => (
          <li key={recruiter.id}>
            {recruiter.name} <span className="muted">· {recruiter.email}</span>
          </li>
        ))}
      </ul>
      {created && (
        <div className="notice" role="status">
          Compte créé. Donnez ces identifiants au recruteur, le mot de passe ne sera plus affiché&nbsp;:
          <br />
          <strong>{created.email}</strong> / <code>{created.password}</code>
        </div>
      )}
      <form
        className="form"
        aria-label="Nouveau recruteur"
        onSubmit={(event) => {
          event.preventDefault();
          add.mutate();
        }}
      >
        <div className="field">
          <label htmlFor="recruiter-name">Nom</label>
          <input id="recruiter-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="recruiter-email">E-mail</label>
          <input id="recruiter-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        {add.isError && (
          <div className="error form-error" role="alert">
            {errorMessage(add.error)}
          </div>
        )}
        <button className="button" type="submit" disabled={add.isPending}>
          Créer le compte
        </button>
      </form>
    </section>
  );
};

const DeleteCompany = ({ token, company }: { token: string; company: CompanyDetail }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deleteCompany(company.id, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/admin', { replace: true });
    },
  });

  return (
    <section className="danger-zone">
      <button
        type="button"
        className="link-button danger"
        onClick={() => {
          // Supprimer une entreprise supprime ses rendez-vous : on demande confirmation.
          if (window.confirm(`Supprimer ${company.name}, ses offres, ses créneaux et ses rendez-vous ?`)) remove.mutate();
        }}
      >
        Supprimer l’entreprise
      </button>
    </section>
  );
};
