import { Route, Routes } from 'react-router';
import { Header } from './components/Header';
import { CatalogPage } from './pages/CatalogPage';
import { CompanyPage } from './pages/CompanyPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';

/** Les routes de l'application, complétées au fil des fonctionnalités. */
const App = () => (
  <main className="app">
    <Header />
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/companies/:id" element={<CompanyPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </main>
);

export default App;
