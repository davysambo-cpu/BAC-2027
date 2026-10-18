import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type {
  CreateRevisionSessionRequest,
  RevisionSession,
  RevisionSessionStatus,
  StudentCatalogueResponse,
} from "@bac-2027/contracts";

import {
  ApiClientError,
  createRevisionSession,
  deleteRevisionSession,
  getStudentCatalogue,
  listRevisionSessions,
  updateRevisionSession,
} from "../auth/api";
import { useAuth } from "../auth/auth-context";
import { AppShell } from "../components/AppShell";
import {
  cacheCatalogue,
  readCachedCatalogue,
  type LocalRevisionSession,
} from "../offline/database";
import {
  listLocalRevisionSessions,
  stageRevisionSessionCreate,
  stageRevisionSessionDelete,
  stageRevisionSessionUpdate,
  storeServerRevisionSessions,
  syncPendingRevisionSessions,
  type RevisionSessionChanges,
  type RevisionSessionLabels,
} from "../offline/planning-sessions";

type PlanningSessionView = RevisionSession | LocalRevisionSession;

interface PlanningForm {
  subjectId: string;
  catalogueItemId: string;
  title: string;
  notes: string;
  scheduledAt: string;
  durationMinutes: string;
}

const planningTransport = {
  create: createRevisionSession,
  update: updateRevisionSession,
  delete: deleteRevisionSession,
};

function defaultScheduledAt(): string {
  const date = new Date(Date.now() + 60 * 60 * 1_000);
  date.setMinutes(date.getMinutes() < 30 ? 30 : 0, 0, 0);
  if (date.getMinutes() === 0) date.setHours(date.getHours() + 1);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function localDateTime(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function emptyForm(): PlanningForm {
  return {
    subjectId: "",
    catalogueItemId: "",
    title: "",
    notes: "",
    scheduledAt: defaultScheduledAt(),
    durationMinutes: "45",
  };
}

function startOfDay(reference: Date): Date {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(reference: Date): Date {
  const date = startOfDay(reference);
  date.setDate(date.getDate() + 1);
  return date;
}

function sameLocalDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function sessionVersion(session: PlanningSessionView): number | null {
  return "serverVersion" in session ? session.serverVersion : session.version;
}

function syncStatus(session: PlanningSessionView): LocalRevisionSession["syncStatus"] | null {
  return "syncStatus" in session ? session.syncStatus : null;
}

function formatSessionDay(value: string): string {
  return new Intl.DateTimeFormat("fr-BF", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatSessionTime(value: string): string {
  return new Intl.DateTimeFormat("fr-BF", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: RevisionSessionStatus): string {
  return {
    planned: "Planifiée",
    completed: "Terminée",
    cancelled: "Annulée",
  }[status];
}

export default function PlanningPage() {
  const auth = useAuth();
  const [catalogue, setCatalogue] = useState<StudentCatalogueResponse | null>(null);
  const [sessions, setSessions] = useState<PlanningSessionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draftSessionId, setDraftSessionId] = useState("");
  const [form, setForm] = useState<PlanningForm>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [referenceNow, setReferenceNow] = useState(() => new Date());

  const personalDevice = auth.session?.deviceType === "personal";
  const studentId = auth.user?.role === "student" ? auth.user.id : null;

  async function reloadLocal() {
    if (!studentId) return;
    setSessions(await listLocalRevisionSessions(studentId));
  }

  async function refreshFromServer() {
    if (!studentId) return;
    const response = await listRevisionSessions();
    if (personalDevice) {
      await storeServerRevisionSessions(studentId, response.sessions);
      await reloadLocal();
    } else {
      setSessions(response.sessions);
    }
  }

  useEffect(() => {
    const interval = window.setInterval(() => setReferenceNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!auth.user) return;
      let hasLocalData = false;
      setLoading(true);
      setError(null);

      if (auth.user.role !== "student") {
        setLoading(false);
        return;
      }

      if (personalDevice) {
        const [localSessions, cachedCatalogue] = await Promise.all([
          listLocalRevisionSessions(auth.user.id),
          readCachedCatalogue(auth.user.seriesCode ?? "D"),
        ]);
        hasLocalData = localSessions.length > 0 || cachedCatalogue !== null;
        if (!cancelled) {
          setSessions(localSessions);
          if (cachedCatalogue) setCatalogue(cachedCatalogue);
        }
      }

      if (auth.offline) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const nextCatalogue = await getStudentCatalogue();
        if (personalDevice) await cacheCatalogue(nextCatalogue);
        if (!cancelled) setCatalogue(nextCatalogue);

        if (personalDevice) {
          await syncPendingRevisionSessions(auth.user.id, planningTransport);
        }
        const response = await listRevisionSessions();
        if (personalDevice) {
          await storeServerRevisionSessions(auth.user.id, response.sessions);
          const local = await listLocalRevisionSessions(auth.user.id);
          if (!cancelled) setSessions(local);
        } else if (!cancelled) {
          setSessions(response.sessions);
        }
      } catch (loadError) {
        if (!cancelled && (!personalDevice || !hasLocalData)) {
          setError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Le planning n'a pas pu être chargé.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [auth.offline, auth.user, personalDevice]);

  const subjects = catalogue?.subjects ?? [];
  const selectedSubject = subjects.find((subject) => subject.id === form.subjectId);
  const selectedTopic = selectedSubject?.items.find((item) => item.id === form.catalogueItemId);

  const groups = useMemo(() => {
    const now = referenceNow.getTime();
    const tomorrowStart = endOfDay(referenceNow).getTime();
    const ordered = [...sessions].sort(
      (first, second) =>
        new Date(first.scheduledAt).getTime() - new Date(second.scheduledAt).getTime(),
    );
    return {
      overdue: ordered.filter(
        (session) => session.status === "planned" && new Date(session.scheduledAt).getTime() < now,
      ),
      today: ordered.filter((session) => {
        const timestamp = new Date(session.scheduledAt).getTime();
        return session.status === "planned" && timestamp >= now && timestamp < tomorrowStart;
      }),
      upcoming: ordered.filter(
        (session) =>
          session.status === "planned" && new Date(session.scheduledAt).getTime() >= tomorrowStart,
      ),
      history: ordered
        .filter((session) => session.status !== "planned")
        .sort(
          (first, second) =>
            new Date(second.completedAt ?? second.updatedAt).getTime() -
            new Date(first.completedAt ?? first.updatedAt).getTime(),
        )
        .slice(0, 8),
    };
  }, [referenceNow, sessions]);

  const today = referenceNow;
  const todaySessions = sessions.filter((session) =>
    sameLocalDay(new Date(session.scheduledAt), today),
  );
  const todayPlannedMinutes = todaySessions
    .filter((session) => session.status === "planned")
    .reduce((total, session) => total + session.durationMinutes, 0);
  const todayCompletedMinutes = sessions
    .filter(
      (session) =>
        session.status === "completed" &&
        session.completedAt !== null &&
        sameLocalDay(new Date(session.completedAt), today),
    )
    .reduce((total, session) => total + session.durationMinutes, 0);
  const dailyGoal = auth.preferences.dailyRevisionGoalMinutes;
  const goalProgress = Math.min(100, Math.round((todayCompletedMinutes / dailyGoal) * 100));

  function labelsFor(subjectId: string, catalogueItemId: string): RevisionSessionLabels {
    const subject = subjects.find((candidate) => candidate.id === subjectId);
    const topic = subject?.items.find((candidate) => candidate.id === catalogueItemId);
    return {
      subjectName: subject?.name ?? null,
      catalogueItemTitle: topic?.title ?? null,
    };
  }

  function openCreateForm() {
    setEditingId(null);
    setDeletingId(null);
    setDraftSessionId(crypto.randomUUID());
    setForm(emptyForm());
    setError(null);
    setMessage(null);
    setFormOpen(true);
  }

  function openEditForm(session: PlanningSessionView) {
    setEditingId(session.id);
    setDeletingId(null);
    setDraftSessionId("");
    setForm({
      subjectId: session.subjectId ?? "",
      catalogueItemId: session.catalogueItemId ?? "",
      title: session.title,
      notes: session.notes ?? "",
      scheduledAt: localDateTime(session.scheduledAt),
      durationMinutes: String(session.durationMinutes),
    });
    setError(null);
    setMessage(null);
    setFormOpen(true);
  }

  function selectSubject(subjectId: string) {
    setForm((current) => ({
      ...current,
      subjectId,
      catalogueItemId: "",
    }));
  }

  function selectTopic(catalogueItemId: string) {
    const topic = selectedSubject?.items.find((candidate) => candidate.id === catalogueItemId);
    setForm((current) => ({
      ...current,
      catalogueItemId,
      title: current.title || topic?.title || "",
    }));
  }

  async function synchronizeAfterLocalMutation(successMessage: string, queuedMessage: string) {
    if (!studentId) return;
    if (auth.offline || !navigator.onLine) {
      setMessage(queuedMessage);
      return;
    }

    let result: Awaited<ReturnType<typeof syncPendingRevisionSessions>>;
    try {
      result = await syncPendingRevisionSessions(studentId, planningTransport);
    } catch {
      setMessage(queuedMessage);
      return;
    }
    if (result.failed > 0) {
      await reloadLocal();
      setMessage(queuedMessage);
      return;
    }

    try {
      await refreshFromServer();
    } catch {
      await reloadLocal();
    }
    setMessage(successMessage);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId) return;
    const durationMinutes = Number(form.durationMinutes);
    if (!form.title.trim() || !form.scheduledAt || durationMinutes < 15) {
      setError("Indiquez un titre, une date et une durée d'au moins 15 minutes.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const labels = labelsFor(form.subjectId, form.catalogueItemId);
      if (editingId) {
        const current = sessions.find((session) => session.id === editingId);
        if (!current) throw new Error("Cette séance n'est plus disponible.");
        const changes: RevisionSessionChanges = {
          subjectId: form.subjectId || null,
          catalogueItemId: form.catalogueItemId || null,
          title: form.title.trim(),
          notes: form.notes.trim() || null,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          durationMinutes,
          status: current.status,
        };
        if (personalDevice) {
          await stageRevisionSessionUpdate(studentId, editingId, changes, labels);
          await reloadLocal();
          await synchronizeAfterLocalMutation(
            "Séance modifiée et synchronisée.",
            "Séance modifiée sur cet appareil. Elle sera synchronisée à la reconnexion.",
          );
        } else {
          const version = sessionVersion(current);
          if (!version) throw new Error("La version de cette séance est indisponible.");
          const updated = await updateRevisionSession(editingId, { ...changes, version });
          setSessions((currentSessions) =>
            currentSessions.map((session) => (session.id === updated.id ? updated : session)),
          );
          setMessage("Séance modifiée.");
        }
      } else {
        const sessionId = draftSessionId || crypto.randomUUID();
        if (!draftSessionId) setDraftSessionId(sessionId);
        const input: CreateRevisionSessionRequest = {
          id: sessionId,
          subjectId: form.subjectId || null,
          catalogueItemId: form.catalogueItemId || null,
          title: form.title.trim(),
          notes: form.notes.trim() || null,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          durationMinutes,
        };
        if (personalDevice) {
          await stageRevisionSessionCreate(studentId, input, labels);
          await reloadLocal();
          await synchronizeAfterLocalMutation(
            "Séance ajoutée au planning.",
            "Séance sauvegardée sur cet appareil. Elle sera synchronisée à la reconnexion.",
          );
        } else {
          const created = await createRevisionSession(input);
          setSessions((currentSessions) => [...currentSessions, created]);
          setMessage("Séance ajoutée au planning.");
        }
      }
      setFormOpen(false);
      setEditingId(null);
      setDraftSessionId("");
      setForm(emptyForm());
    } catch (saveError) {
      setError(
        saveError instanceof ApiClientError
          ? saveError.message
          : saveError instanceof Error
            ? saveError.message
            : "La séance n'a pas pu être enregistrée.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCompleted(session: PlanningSessionView) {
    if (!studentId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const status = session.status === "completed" ? "planned" : "completed";
    const changes: RevisionSessionChanges = {
      subjectId: session.subjectId,
      catalogueItemId: session.catalogueItemId,
      title: session.title,
      notes: session.notes,
      scheduledAt: session.scheduledAt,
      durationMinutes: session.durationMinutes,
      status,
    };
    try {
      if (personalDevice) {
        await stageRevisionSessionUpdate(studentId, session.id, changes, {
          subjectName: session.subjectName,
          catalogueItemTitle: session.catalogueItemTitle,
        });
        await reloadLocal();
        await synchronizeAfterLocalMutation(
          status === "completed" ? "Séance terminée. Bravo !" : "Séance rouverte.",
          status === "completed"
            ? "Séance terminée sur cet appareil. La validation sera synchronisée à la reconnexion."
            : "Séance rouverte sur cet appareil. Le changement sera synchronisé à la reconnexion.",
        );
      } else {
        const version = sessionVersion(session);
        if (!version) throw new Error("La version de cette séance est indisponible.");
        const updated = await updateRevisionSession(session.id, { ...changes, version });
        setSessions((current) =>
          current.map((candidate) => (candidate.id === updated.id ? updated : candidate)),
        );
        setMessage(status === "completed" ? "Séance terminée. Bravo !" : "Séance rouverte.");
      }
    } catch (updateError) {
      setError(
        updateError instanceof ApiClientError
          ? updateError.message
          : "Le statut de la séance n'a pas pu être modifié.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeSession(session: PlanningSessionView) {
    if (!studentId) return;
    if (deletingId !== session.id) {
      setDeletingId(session.id);
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (personalDevice) {
        await stageRevisionSessionDelete(studentId, session.id);
        await reloadLocal();
        await synchronizeAfterLocalMutation(
          "Séance supprimée du planning.",
          "Séance retirée sur cet appareil. La suppression sera synchronisée à la reconnexion.",
        );
      } else {
        const version = sessionVersion(session);
        if (!version) throw new Error("La version de cette séance est indisponible.");
        await deleteRevisionSession(session.id, { version });
        setSessions((current) => current.filter((candidate) => candidate.id !== session.id));
        setMessage("Séance supprimée du planning.");
      }
      setDeletingId(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof ApiClientError
          ? deleteError.message
          : "La séance n'a pas pu être supprimée.",
      );
    } finally {
      setSaving(false);
    }
  }

  function renderSession(session: PlanningSessionView) {
    const localSync = syncStatus(session);
    return (
      <article className={`planning-session ${session.status}`} key={session.id}>
        <div className="planning-session-date" aria-label={formatSessionDay(session.scheduledAt)}>
          <strong>{formatSessionTime(session.scheduledAt)}</strong>
          <span>{formatSessionDay(session.scheduledAt)}</span>
        </div>
        <div className="planning-session-main">
          <div className="planning-session-title">
            <h3>{session.title}</h3>
            <span className={`planning-status ${session.status}`}>
              {statusLabel(session.status)}
            </span>
            {localSync && localSync !== "synced" && (
              <span className={`planning-sync ${localSync}`}>
                {localSync === "failed" ? "À resynchroniser" : "Sur cet appareil"}
              </span>
            )}
          </div>
          <p>
            {session.subjectName ?? "Révision générale"}
            {session.catalogueItemTitle ? ` · ${session.catalogueItemTitle}` : ""}
          </p>
          <small>
            {session.durationMinutes} min
            {session.notes ? ` · ${session.notes}` : ""}
          </small>
        </div>
        <div className="planning-session-actions">
          <button
            type="button"
            className={session.status === "completed" ? "text-action" : "session-complete"}
            disabled={saving}
            onClick={() => void toggleCompleted(session)}
          >
            {session.status === "completed" ? "Rouvrir" : "Terminer"}
          </button>
          <button type="button" className="text-action" onClick={() => openEditForm(session)}>
            Modifier
          </button>
          <button
            type="button"
            className={deletingId === session.id ? "session-delete confirm" : "session-delete"}
            disabled={saving}
            onClick={() => void removeSession(session)}
          >
            {deletingId === session.id ? "Confirmer" : "Supprimer"}
          </button>
        </div>
      </article>
    );
  }

  function renderGroup(title: string, description: string, items: PlanningSessionView[]) {
    if (items.length === 0) return null;
    return (
      <section className="panel-card planning-group">
        <div className="planning-group-heading">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <span>{items.length}</span>
        </div>
        <div className="planning-session-list">{items.map(renderSession)}</div>
      </section>
    );
  }

  return (
    <AppShell>
      <div className="page-heading planning-heading">
        <div>
          <p className="ui-eyebrow">Votre rythme</p>
          <h1>Planning de révision</h1>
          <p>
            Transformez les priorités du carnet en petites séances réalistes, puis validez le
            travail réellement effectué.
          </p>
        </div>
        {studentId && (
          <button className="primary-action fit" type="button" onClick={openCreateForm}>
            + Planifier une séance
          </button>
        )}
      </div>

      {message && (
        <div className="success-alert page-alert" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="form-alert page-alert" role="alert">
          {error}
        </div>
      )}

      {!studentId ? (
        <section className="panel-card empty-state">
          Le planning personnel est réservé aux comptes élèves.
        </section>
      ) : (
        <>
          <section className="planning-summary" aria-label="Résumé du planning">
            <article className="planning-goal-card">
              <div>
                <span>Objectif du jour</span>
                <strong>
                  {todayCompletedMinutes}/{dailyGoal} min
                </strong>
              </div>
              <progress max={dailyGoal} value={todayCompletedMinutes} />
              <small>{goalProgress} % réalisé aujourd'hui</small>
            </article>
            <article>
              <strong>{todayPlannedMinutes}</strong>
              <span>minutes encore prévues aujourd'hui</span>
            </article>
            <article className={groups.overdue.length > 0 ? "attention" : ""}>
              <strong>{groups.overdue.length}</strong>
              <span>séance{groups.overdue.length > 1 ? "s" : ""} en retard</span>
            </article>
            <article className="planning-goal-link">
              <span>Rythme personnel</span>
              <Link to="/profil">Modifier l'objectif</Link>
            </article>
          </section>

          {formOpen && (
            <section className="panel-card planning-form-panel">
              <div className="panel-heading">
                <div>
                  <p className="ui-eyebrow">{editingId ? "Ajuster" : "Nouvelle séance"}</p>
                  <h2>{editingId ? "Modifier cette séance" : "Planifier un travail réalisable"}</h2>
                </div>
                <button
                  type="button"
                  className="text-action"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingId(null);
                    setDraftSessionId("");
                  }}
                >
                  Fermer
                </button>
              </div>
              <form className="planning-form" onSubmit={(event) => void submit(event)}>
                <label>
                  Matière <small>(facultatif)</small>
                  <select
                    value={form.subjectId}
                    onChange={(event) => selectSubject(event.target.value)}
                  >
                    <option value="">Révision générale</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Thème du programme <small>(facultatif)</small>
                  <select
                    value={form.catalogueItemId}
                    disabled={!selectedSubject}
                    onChange={(event) => selectTopic(event.target.value)}
                  >
                    <option value="">
                      {selectedSubject ? "Choisir un thème" : "Choisir d'abord une matière"}
                    </option>
                    {selectedSubject?.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-wide">
                  Titre
                  <input
                    required
                    minLength={2}
                    maxLength={240}
                    value={form.title}
                    placeholder="Ex. Revoir le cours et refaire deux exercices"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Date et heure
                  <input
                    required
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, scheduledAt: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Durée prévue
                  <select
                    value={form.durationMinutes}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, durationMinutes: event.target.value }))
                    }
                  >
                    {[15, 20, 30, 45, 60, 90, 120].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} minutes
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-wide">
                  Consigne personnelle <small>(facultatif)</small>
                  <textarea
                    rows={3}
                    maxLength={2_000}
                    value={form.notes}
                    placeholder="Ex. restituer sans regarder, puis vérifier avec mon cours"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </label>
                <div className="planning-form-footer form-wide">
                  <p>
                    {selectedTopic
                      ? `Cette séance sera reliée au thème « ${selectedTopic.title} ».`
                      : "Une séance courte et précise est plus facile à terminer régulièrement."}
                  </p>
                  <button className="primary-action fit" type="submit" disabled={saving}>
                    {saving
                      ? "Enregistrement…"
                      : editingId
                        ? "Enregistrer les modifications"
                        : "Ajouter au planning"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {loading && <section className="panel-card empty-state">Chargement du planning…</section>}
          {!loading && sessions.length === 0 && !formOpen && (
            <section className="panel-card planning-empty">
              <span aria-hidden="true">◎</span>
              <div>
                <p className="ui-eyebrow">Premier pas</p>
                <h2>Planifiez une courte séance</h2>
                <p>
                  Commencez par 30 à 45 minutes sur un thème déjà étudié. Vous pourrez ajuster le
                  planning à tout moment.
                </p>
              </div>
              <button className="secondary-action" type="button" onClick={openCreateForm}>
                Créer ma première séance
              </button>
            </section>
          )}

          {renderGroup(
            "En retard",
            "À replanifier ou terminer pour garder une liste réaliste.",
            groups.overdue,
          )}
          {renderGroup("Aujourd'hui", "Le travail prévu pour cette journée.", groups.today)}
          {renderGroup("À venir", "Les prochaines séances déjà organisées.", groups.upcoming)}
          {renderGroup(
            "Historique récent",
            "Les dernières séances terminées ou annulées.",
            groups.history,
          )}
        </>
      )}
    </AppShell>
  );
}
