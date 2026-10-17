import { type FormEvent, useState } from "react";

import { ApiClientError } from "../auth/api";
import { useAuth } from "../auth/auth-context";
import { AppShell } from "../components/AppShell";

export function ProfilePage() {
  const auth = useAuth();
  const [displayName, setDisplayName] = useState(auth.user?.displayName ?? "");
  const [goal, setGoal] = useState(auth.preferences.dailyRevisionGoalMinutes);
  const [wifiOnly, setWifiOnly] = useState(auth.preferences.downloadOnWifiOnly);
  const [reducedMotion, setReducedMotion] = useState(auth.preferences.reducedMotion);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await auth.saveProfile({
        displayName,
        preferences: {
          dailyRevisionGoalMinutes: goal,
          downloadOnWifiOnly: wifiOnly,
          reducedMotion,
        },
      });
      setMessage("Profil enregistré.");
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="ui-eyebrow">Votre espace</p>
          <h1>Profil</h1>
          <p>Seules les informations indispensables sont conservées.</p>
        </div>
      </div>
      <div className="profile-grid">
        <form className="panel-card profile-form" onSubmit={(event) => void submit(event)}>
          <div className="profile-identity">
            <span className="large-avatar">{auth.user?.displayName.slice(0, 2).toUpperCase()}</span>
            <div>
              <h2>{auth.user?.displayName}</h2>
              <p>
                @{auth.user?.username} ·{" "}
                {auth.user?.seriesCode ? `Série ${auth.user.seriesCode}` : "Administration"}
              </p>
            </div>
          </div>
          {message && (
            <div className="success-alert" role="status">
              {message}
            </div>
          )}
          {error && (
            <div className="form-alert" role="alert">
              {error}
            </div>
          )}
          <label>
            Nom affiché
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              minLength={2}
              maxLength={120}
              required
            />
          </label>
          <label>
            Objectif quotidien
            <select value={goal} onChange={(event) => setGoal(Number(event.target.value))}>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 heure</option>
              <option value={90}>1 h 30</option>
              <option value={120}>2 heures</option>
            </select>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={wifiOnly}
              onChange={(event) => setWifiOnly(event.target.checked)}
            />
            <span>
              <strong>Télécharger les médias lourds uniquement en Wi-Fi</strong>
              <small>Cette préférence limitera l'utilisation des données mobiles.</small>
            </span>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(event) => setReducedMotion(event.target.checked)}
            />
            <span>
              <strong>Réduire les animations</strong>
              <small>Améliore le confort et peut économiser des ressources.</small>
            </span>
          </label>
          <button className="primary-action fit" type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
        <aside className="panel-card privacy-panel">
          <p className="ui-eyebrow">Vie privée</p>
          <h2>Profil minimal</h2>
          <p>BAC-2027 ne demande dans le MVP ni téléphone, ni e-mail, ni date de naissance.</p>
          <dl>
            <div>
              <dt>Nom d'utilisateur</dt>
              <dd>Géré par l'administration</dd>
            </div>
            <div>
              <dt>Série</dt>
              <dd>Série D</dd>
            </div>
            <div>
              <dt>Session</dt>
              <dd>
                {auth.session?.deviceType === "personal"
                  ? "Personnelle · accès hors ligne"
                  : "Partagée · session courte"}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </AppShell>
  );
}
