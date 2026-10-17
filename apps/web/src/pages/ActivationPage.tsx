import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { ApiClientError } from "../auth/api";
import { useAuth } from "../auth/auth-context";
import { AuthLayout } from "../components/AuthLayout";

export function ActivationPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await auth.activate({
        token,
        password,
        deviceType: form.get("deviceType") === "shared" ? "shared" : "personal",
      });
      navigate("/app", { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : "Activation impossible pour le moment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <p className="ui-eyebrow">Première connexion</p>
      <h2>Activez votre espace</h2>
      <p className="auth-intro">
        Choisissez votre mot de passe. Le lien ne pourra être utilisé qu'une seule fois.
      </p>
      {!token && (
        <div className="form-alert" role="alert">
          Le lien d'invitation ne contient aucun code valide.
        </div>
      )}
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      <form className="stack-form" onSubmit={(event) => void submit(event)}>
        <label>
          Nouveau mot de passe
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            aria-describedby="password-help"
          />
        </label>
        <p id="password-help" className="field-help">
          Au moins 10 caractères, dont une lettre et un chiffre.
        </p>
        <label>
          Confirmer le mot de passe
          <input
            name="confirmation"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </label>
        <fieldset className="device-choice">
          <legend>Type d'appareil</legend>
          <label>
            <input type="radio" name="deviceType" value="personal" defaultChecked />
            <span>
              <strong>Personnel</strong>
              <small>Autoriser l'accès hors ligne.</small>
            </span>
          </label>
          <label>
            <input type="radio" name="deviceType" value="shared" />
            <span>
              <strong>Partagé</strong>
              <small>Ne pas conserver les données privées.</small>
            </span>
          </label>
        </fieldset>
        <button className="primary-action" type="submit" disabled={!token || submitting}>
          {submitting ? "Activation…" : "Activer mon compte"}
        </button>
      </form>
      <div className="auth-links">
        <Link to="/connexion">Retour à la connexion</Link>
      </div>
    </AuthLayout>
  );
}
