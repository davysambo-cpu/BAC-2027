import { Link } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { AppShell } from "../components/AppShell";

export function DashboardPage() {
  const auth = useAuth();

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="ui-eyebrow">Votre espace personnel</p>
          <h1>Bonjour {auth.user?.displayName}</h1>
          <p>Votre compte est prêt. Les outils de révision seront ajoutés partie par partie.</p>
        </div>
        <span className="account-badge">Compte actif</span>
      </div>
      <div className="account-summary-grid">
        <article>
          <span className="summary-symbol">ID</span>
          <div>
            <small>Nom d'utilisateur</small>
            <strong>@{auth.user?.username}</strong>
          </div>
        </article>
        <article>
          <span className="summary-symbol">D</span>
          <div>
            <small>Série pilote</small>
            <strong>
              {auth.user?.seriesCode ? `Série ${auth.user.seriesCode}` : "Administration"}
            </strong>
          </div>
        </article>
        <article>
          <span className="summary-symbol">↻</span>
          <div>
            <small>Type de session</small>
            <strong>
              {auth.session?.deviceType === "personal" ? "Appareil personnel" : "Appareil partagé"}
            </strong>
          </div>
        </article>
      </div>
      <div className="dashboard-columns">
        <section className="panel-card next-step-card">
          <p className="ui-eyebrow">Disponible maintenant</p>
          <h2>Ajoutez votre premier bilan de cours</h2>
          <p>
            Choisissez une matière, retrouvez le thème étudié et notez ce que vous avez retenu.
            Votre texte original restera toujours conservé.
          </p>
          <Link className="primary-link" to="/ressources">
            Ouvrir mes ressources
          </Link>
        </section>
        <section className="panel-card security-card">
          <div className="panel-title">
            <span className="security-mark">✓</span>
            <div>
              <p className="ui-eyebrow">Sécurité</p>
              <h2>Accès protégé</h2>
            </div>
          </div>
          <ul>
            <li>Session dans un cookie inaccessible au JavaScript</li>
            <li>Mot de passe protégé avec Argon2id</li>
            <li>Documents personnels privés par défaut</li>
          </ul>
        </section>
      </div>
      {auth.user?.role === "admin" && (
        <section className="panel-card admin-callout">
          <div>
            <p className="ui-eyebrow">Administration</p>
            <h2>Gérer les accès du pilote</h2>
            <p>
              Créez les liens d'invitation et les codes de récupération depuis l'espace protégé.
            </p>
          </div>
          <Link className="secondary-link" to="/admin">
            Ouvrir l'administration
          </Link>
        </section>
      )}
    </AppShell>
  );
}
