import { type FormEvent, useCallback, useEffect, useState } from "react";

import type { CurrentUser, InvitationResponse, ResetCodeResponse } from "@bac-2027/contracts";

import {
  ApiClientError,
  createInvitation,
  createResetCode,
  listUsers,
  updateUserStatus,
} from "../auth/api";
import { useAuth } from "../auth/auth-context";
import { AppShell } from "../components/AppShell";
import { KnowledgeCardsPanel } from "../components/KnowledgeCardsPanel";

export function AdminPage() {
  const auth = useAuth();
  const [users, setUsers] = useState<CurrentUser[]>([]);
  const [invitation, setInvitation] = useState<InvitationResponse | null>(null);
  const [resetCode, setResetCode] = useState<ResetCodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const response = await listUsers();
      setUsers(response.users);
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listUsers()
      .then((response) => {
        if (!cancelled) {
          setUsers(response.users);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setPending(true);
    setError(null);
    setResetCode(null);
    try {
      const created = await createInvitation({
        displayName: String(fields.get("displayName") ?? ""),
        username: String(fields.get("username") ?? ""),
      });
      setInvitation(created);
      setCopied(false);
      form.reset();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function generateReset(user: CurrentUser) {
    setPending(true);
    setError(null);
    setInvitation(null);
    try {
      setResetCode(await createResetCode(user.id));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function toggleStatus(user: CurrentUser) {
    setPending(true);
    setError(null);
    try {
      const updated = await updateUserStatus(
        user.id,
        user.status === "disabled" ? "active" : "disabled",
      );
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function copyInvitation() {
    if (!invitation) return;
    const url = new URL(invitation.activationPath, window.location.origin).toString();
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="ui-eyebrow">Accès protégés</p>
          <h1>Administration</h1>
          <p>Invitez les élèves et intervenez seulement lorsqu'ils demandent une récupération.</p>
        </div>
        <span className="account-badge">
          {users.length} compte{users.length > 1 ? "s" : ""}
        </span>
      </div>
      {error && (
        <div className="form-alert page-alert" role="alert">
          {error}
        </div>
      )}
      <div className="admin-grid">
        <form
          className="panel-card invitation-form"
          onSubmit={(event) => void submitInvitation(event)}
        >
          <div>
            <p className="ui-eyebrow">Nouvel accès</p>
            <h2>Inviter un élève</h2>
            <p>Le lien restera valable 72 heures et une seule fois.</p>
          </div>
          <label>
            Nom affiché
            <input name="displayName" placeholder="Ex. Awa Koné" minLength={2} required />
          </label>
          <label>
            Nom d'utilisateur
            <input
              name="username"
              placeholder="Ex. awa07"
              pattern="[a-z0-9][a-z0-9._-]{2,31}"
              required
            />
            <small>Lettres minuscules, chiffres, point, tiret ou soulignement.</small>
          </label>
          <button className="primary-action fit" type="submit" disabled={pending}>
            {pending ? "Création…" : "Créer le lien"}
          </button>
        </form>
        <section className="panel-card admin-result" aria-live="polite">
          {!invitation && !resetCode && (
            <>
              <span className="result-icon">↗</span>
              <h2>Remise manuelle</h2>
              <p>
                Le lien ou le code créé apparaîtra ici. Remettez-le directement à l'élève, sans
                publication dans un groupe.
              </p>
            </>
          )}
          {invitation && (
            <>
              <p className="ui-eyebrow">Invitation créée</p>
              <h2>{invitation.displayName}</h2>
              <code>{new URL(invitation.activationPath, window.location.origin).toString()}</code>
              <p>Expire le {formatDate(invitation.expiresAt)}.</p>
              <button
                className="secondary-action"
                type="button"
                onClick={() => void copyInvitation()}
              >
                {copied ? "Lien copié" : "Copier le lien"}
              </button>
            </>
          )}
          {resetCode && (
            <>
              <p className="ui-eyebrow">Code temporaire</p>
              <h2>@{resetCode.username}</h2>
              <strong className="reset-code">{resetCode.code}</strong>
              <p>
                Expire le {formatDate(resetCode.expiresAt)}. Ce code ne sera plus affiché après
                avoir quitté la page.
              </p>
            </>
          )}
        </section>
      </div>
      <section className="panel-card user-list-panel">
        <div className="panel-heading">
          <div>
            <p className="ui-eyebrow">Pilote</p>
            <h2>Comptes existants</h2>
          </div>
          <button className="text-action" type="button" onClick={() => void loadUsers()}>
            Actualiser
          </button>
        </div>
        {loading ? (
          <p>Chargement des comptes…</p>
        ) : (
          <div className="user-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>État</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.displayName}</strong>
                      <small>@{user.username}</small>
                    </td>
                    <td>{user.role === "admin" ? "Admin" : "Élève · Série D"}</td>
                    <td>
                      <span className={`status-pill ${user.status}`}>
                        {statusLabel(user.status)}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        {user.role === "student" && user.status === "active" && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => void generateReset(user)}
                          >
                            Code de récupération
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={pending || user.id === auth.user?.id}
                          onClick={() => void toggleStatus(user)}
                        >
                          {user.status === "disabled" ? "Réactiver" : "Désactiver"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="empty-state">Aucun compte.</p>}
          </div>
        )}
      </section>
      <KnowledgeCardsPanel />
    </AppShell>
  );
}

function statusLabel(status: CurrentUser["status"]): string {
  if (status === "active") return "Actif";
  if (status === "disabled") return "Désactivé";
  return "Invité";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-BF", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : "L'opération n'a pas abouti.";
}
