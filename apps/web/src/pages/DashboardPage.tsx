import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import type { RevisionOverview } from "@bac-2027/contracts";

import { getRevisionOverview } from "../auth/api";
import { useAuth } from "../auth/auth-context";
import { AppShell } from "../components/AppShell";
import { cacheRevisionOverview, readCachedRevisionOverview } from "../offline/database";

function revisionCallToAction(overview: RevisionOverview | null) {
  if (!overview || overview.summary.startedTopics === 0) {
    return {
      eyebrow: "Première étape",
      title: "Ajoutez votre premier bilan de cours",
      description:
        "Choisissez une matière, retrouvez le thème étudié et notez ce que vous avez retenu. Votre texte original restera toujours conservé.",
      label: "Commencer mon carnet",
    };
  }
  if (overview.summary.dueTopics > 0) {
    return {
      eyebrow: "À faire maintenant",
      title: `${overview.summary.dueTopics} thème${overview.summary.dueTopics > 1 ? "s" : ""} à revoir`,
      description:
        "Une courte révision aujourd'hui consolidera vos acquis et évitera de tout reprendre à l'approche de juillet 2027.",
      label: "Voir ma liste de révision",
    };
  }
  if (overview.summary.coursesReady > overview.summary.reviewedTopics) {
    return {
      eyebrow: "Cours personnels prêts",
      title: "Commencez une révision active",
      description:
        "Relisez un cours validé, essayez de le restituer sans regarder, puis indiquez honnêtement votre niveau de maîtrise.",
      label: "Choisir un thème",
    };
  }
  return {
    eyebrow: "Progression régulière",
    title: "Continuez à alimenter votre carnet",
    description:
      "Ajoutez les nouveaux cours reçus en classe et revenez sur les rappels proposés. Votre historique se construit jusqu'aux révisions finales.",
    label: "Ouvrir mon carnet",
  };
}

export function DashboardPage() {
  const auth = useAuth();
  const [revisionOverview, setRevisionOverview] = useState<RevisionOverview | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadRevisionProgress() {
      if (!auth.user || auth.user.role !== "student") return;
      if (auth.session?.deviceType === "personal") {
        const cached = await readCachedRevisionOverview(auth.user.id);
        if (!cancelled && cached) setRevisionOverview(cached);
      }
      if (auth.offline) return;
      try {
        const overview = await getRevisionOverview();
        if (auth.session?.deviceType === "personal") {
          await cacheRevisionOverview(auth.user.id, overview);
        }
        if (!cancelled) setRevisionOverview(overview);
      } catch {
        // Le tableau de bord reste utilisable avec la dernière progression mise en cache.
      }
    }
    void loadRevisionProgress();
    return () => {
      cancelled = true;
    };
  }, [auth.offline, auth.session?.deviceType, auth.user]);

  const nextStep = revisionCallToAction(revisionOverview);
  const completion = revisionOverview
    ? Math.round(
        (revisionOverview.summary.startedTopics /
          Math.max(revisionOverview.summary.totalTopics, 1)) *
          100,
      )
    : 0;

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="ui-eyebrow">Votre espace personnel</p>
          <h1>Bonjour {auth.user?.displayName}</h1>
          <p>
            Le programme organise le chemin ; vos cours et vos révisions construisent
            progressivement votre préparation au BAC 2027.
          </p>
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
          <p className="ui-eyebrow">{nextStep.eyebrow}</p>
          <h2>{nextStep.title}</h2>
          <p>{nextStep.description}</p>
          {revisionOverview && (
            <div
              className="dashboard-revision-progress"
              aria-label={`${completion} % du programme commencé`}
            >
              <div>
                <span>Programme commencé</span>
                <strong>{completion} %</strong>
              </div>
              <progress
                max={revisionOverview.summary.totalTopics}
                value={revisionOverview.summary.startedTopics}
              />
              <small>
                {revisionOverview.summary.masteredTopics} bien maîtrisés · objectif juillet 2027
              </small>
            </div>
          )}
          <Link className="primary-link" to="/ressources">
            {nextStep.label}
          </Link>
        </section>
        <section className="panel-card security-card">
          <div className="panel-title">
            <span className="security-mark">✓</span>
            <div>
              <p className="ui-eyebrow">Méthode durable</p>
              <h2>Votre mémoire reste privée</h2>
            </div>
          </div>
          <ul>
            <li>Programme utilisé comme liste de contrôle, jamais comme cours inventé</li>
            <li>Bilans originaux et décisions conservés</li>
            <li>Rappels espacés selon votre propre auto-évaluation</li>
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
