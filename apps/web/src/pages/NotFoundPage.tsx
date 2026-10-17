import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="not-found">
      <span>B27</span>
      <p className="ui-eyebrow">Erreur 404</p>
      <h1>Cette page n'existe pas.</h1>
      <Link className="primary-link" to="/">
        Retour à BAC-2027
      </Link>
    </main>
  );
}
