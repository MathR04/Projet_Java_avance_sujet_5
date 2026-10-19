import { Link } from 'react-router';

export const NotFoundPage = () => (
  <section className="page not-found">
    <h2>Page introuvable</h2>
    <p>
      <Link to="/">Retour aux entreprises</Link>
    </p>
  </section>
);
