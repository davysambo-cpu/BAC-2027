import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import type { RevisionOverview, RevisionSession } from "@bac-2027/contracts";

import {
  createRevisionSession,
  deleteRevisionSession,
  getRevisionOverview,
  listRevisionSessions,
  updateRevisionSession,
} from "../auth/api";
import { useAuth } from "../auth/auth-context";
import { AppShell } from "../components/AppShell";
import {
  cacheRevisionOverview,
  readCachedRevisionOverview,
  type LocalRevisionSession,
} from "../offline/database";
import {
  listLocalRevisionSessions,
  storeServerRevisionSessions,
  syncPendingRevisionSessions,
} from "../offline/planning-sessions";

type DashboardSession = RevisionSession | LocalRevisionSession;

const planningTransport = {
  create: createRevisionSession,
  update: updateRevisionSession,
  delete: deleteRevisionSession,
};

function revisionCallToAction(overview: RevisionOverview | null, sessions: DashboardSession[]) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const planned = sessions.filter((session) => session.status === "planned");
  const overdue = planned.filter(
    (session) => new Date(session.scheduledAt).getTime() < now.getTime(),
  );
  const today = planned.filter((session) => {
    const timestamp = new Date(session.scheduledAt).getTime();
    return timestamp >= now.getTime() && timestamp < tomorrowStart.getTime();
  });

  if (overdue.length > 0) {
    return {
      eyebrow: "Priorité du jour",
      title: `${overdue.length} séance${overdue.length > 1 ? "s" : ""} à replanifier`,
      description:
        "Gardez un planning réaliste : terminez ce qui a été fait ou déplacez les séances restantes vers un moment disponible.",
      label: "Mettre à jour mon planning",
      to: "/planning",
    };
  }
  if (today.length > 0) {
    const next = today[0]!;
    return {
      eyebrow: "Prévu aujourd'hui",
      title: next.title,
      description: `${next.durationMinutes} minutes${next.subjectName ? ` · ${next.subjectName}` : ""}. Une fois le travail réalisé, validez la séance pour suivre votre rythme réel.`,
      label: "Voir la séance",
      to: "/planning",
    };
  }
  if (!overview || overview.summary.startedTopics === 0) {
    return {
      eyebrow: "Première étape",
      title: "Ajoutez votre premier bilan de cours",
      description:
        "Choisissez une matière, retrouvez le thème étudié et notez ce que vous avez retenu. Votre texte original restera toujours conservé.",
      label: "Commencer mon carnet",
      to: "/ressources",
    };
  }
  if (overview.summary.dueTopics > 0) {
    return {
      eyebrow: "À faire maintenant",
      title: `${overview.summary.dueTopics} thème${overview.summary.dueTopics > 1 ? "s" : ""} à revoir`,
      description:
        "Une courte révision aujourd'hui consolidera vos acquis et évitera de tout reprendre à l'approche de juillet 2027.",
      label: "Voir ma liste de révision",
      to: "/ressources",
    };
  }
  if (overview.summary.coursesReady > overview.summary.reviewedTopics) {
    return {
      eyebrow: "Cours personnels prêts",
      title: "Commencez une révision active",
      description:
        "Relisez un cours validé, essayez de le restituer sans regarder, puis indiquez honnêtement votre niveau de maîtrise.",
      label: "Choisir un thème",
      to: "/ressources",
    };
  }
  return {
    eyebrow: "Progression régulière",
    title: "Planifiez votre prochaine courte séance",
    description:
      "Transformez un thème à revoir en rendez-vous réaliste. Quelques séances régulières valent mieux qu'une longue reprise à la dernière minute.",
    label: "Ouvrir mon planning",
    to: "/planning",
  };
}

export function DashboardPage() {
  const auth = useAuth();
  const [revisionOverview, setRevisionOverview] = useState<RevisionOverview | null>(null);
  const [planningSessions, setPlanningSessions] = useState<DashboardSession[]>([]);

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

  useEffect(() => {
    let cancelled = false;
    async function loadPlanning() {
      if (!auth.user || auth.user.role !== "student") return;
      const personalDevice = auth.session?.deviceType === "personal";
      if (personalDevice) {
        const local = await listLocalRevisionSessions(auth.user.id);
        if (!cancelled) setPlanningSessions(local);
      }
      if (auth.offline) return;
      try {
        if (personalDevice) {
          await syncPendingRevisionSessions(auth.user.id, planningTransport);
        }
        const response = await listRevisionSessions();
        if (personalDevice) {
          await storeServerRevisionSessions(auth.user.id, response.sessions);
          const local = await listLocalRevisionSessions(auth.user.id);
          if (!cancelled) setPlanningSessions(local);
        } else if (!cancelled) {
          setPlanningSessions(response.sessions);
        }
      } catch {
        // La dernière version locale reste affichée sur un appareil personnel.
      }
    }
    void loadPlanning();
    return () => {
      cancelled = true;
    };
  }, [auth.offline, auth.session?.deviceType, auth.user]);

  const nextStep = revisionCallToAction(revisionOverview, planningSessions);
  const completion = revisionOverview
    ? Math.round(
        (revisionOverview.summary.startedTopics /
          Math.max(revisionOverview.summary.totalTopics, 1)) *
          100,
      )
    : 0;
  const now = new Date();
  const todayCompletedMinutes = planningSessions
    .filter(
      (session) =>
        session.status === "completed" &&
        session.completedAt !== null &&
        new Date(session.completedAt).toDateString() === now.toDateString(),
    )
    .reduce((total, session) => total + session.durationMinutes, 0);
  const overdueSessions = planningSessions.filter(
    (session) =>
      session.status === "planned" && new Date(session.scheduledAt).getTime() < now.getTime(),
  );
  const nextSession = [...planningSessions]
    .filter(
      (session) =>
        session.status === "planned" && new Date(session.scheduledAt).getTime() >= now.getTime(),
    )
    .sort(
      (first, second) =>
        new Date(first.scheduledAt).getTime() - new Date(second.scheduledAt).getTime(),
    )[0];

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
      {auth.user?.role === "student" && (
        <section className="dashboard-planning-overview" aria-label="Rythme de révision">
          <article>
            <span className="summary-symbol">◎</span>
            <div>
              <small>Objectif aujourd'hui</small>
              <strong>
                {todayCompletedMinutes}/{auth.preferences.dailyRevisionGoalMinutes} min
              </strong>
            </div>
          </article>
          <article className={overdueSessions.length > 0 ? "attention" : ""}>
            <span className="summary-symbol">!</span>
            <div>
              <small>À replanifier</small>
              <strong>
                {overdueSessions.length} séance{overdueSessions.length > 1 ? "s" : ""}
              </strong>
            </div>
          </article>
          <article>
            <span className="summary-symbol">→</span>
            <div>
              <small>Prochaine séance</small>
              <strong>
                {nextSession
                  ? new Intl.DateTimeFormat("fr-BF", {
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(nextSession.scheduledAt))
                  : "À planifier"}
              </strong>
            </div>
          </article>
          <Link to="/planning">Ouvrir le planning</Link>
        </section>
      )}
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
          <Link className="primary-link" to={nextStep.to}>
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
