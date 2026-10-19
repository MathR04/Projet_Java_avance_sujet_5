import { Route, Routes } from 'react-router';
import { RequireRole } from './auth/RequireRole';
import { Header } from './components/Header';
import { AdminCompanyPage } from './pages/AdminCompanyPage';
import { AdminPage } from './pages/AdminPage';
import { CatalogPage } from './pages/CatalogPage';
import { CompanyPage } from './pages/CompanyPage';
import { LoginPage } from './pages/LoginPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RecruiterPage } from './pages/RecruiterPage';
import { RegisterPage } from './pages/RegisterPage';

/**
 * Les routes de l'application. Les pages d'un rôle sont gardées par
 * <RequireRole>, qui renvoie vers /login si personne n'est connecté.
 *
 *   /                      le catalogue, public
 *   /companies/:id         une entreprise, ses offres, ses créneaux
 *   /login, /register      la connexion, l'inscription d'un élève
 *   /me                    l'élève : ses rendez-vous et son CV
 *   /recruiter             le recruteur : son planning
 *   /admin                 l'équipe : le tableau de bord des stands
 *   /admin/companies/:id   l'équipe : une entreprise, ses offres, ses recruteurs ("new" pour en créer une)
 */
const App = () => (
  <main className="app">
    <Header />
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/companies/:id" element={<CompanyPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/me" element={<RequireRole role="STUDENT"><MyBookingsPage /></RequireRole>} />
      <Route path="/recruiter" element={<RequireRole role="RECRUITER"><RecruiterPage /></RequireRole>} />
      <Route path="/admin" element={<RequireRole role="STAFF"><AdminPage /></RequireRole>} />
      <Route path="/admin/companies/:id" element={<RequireRole role="STAFF"><AdminCompanyPage /></RequireRole>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </main>
);

export default App;
