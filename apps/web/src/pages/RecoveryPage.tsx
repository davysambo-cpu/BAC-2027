import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiClientError } from "../auth/api";
import { useAuth } from "../auth/auth-context";
import { AuthLayout } from "../components/AuthLayout";

export function RecoveryPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirmation") ?? "")) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await auth.resetPassword({
        username: String(form.get("username") ?? ""),
        code: String(form.get("code") ?? ""),
        password,
        deviceType: form.get("deviceType") === "shared" ? "shared" : "personal",
      });
      navigate("/app", { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Réinitialisation impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <p className="ui-eyebrow">Récupération</p>
      <h2>Créez un nouveau mot de passe</h2>
      <p className="auth-intro">
        Demandez d'abord à l'administrateur un code temporaire de 8 chiffres. Il reste valable 30
        minutes.
      </p>
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      <form className="stack-form" onSubmit={(event) => void submit(event)}>
        <label>
          Nom d'utilisateur
          <input name="username" autoComplete="username" required />
        </label>
        <label>
          Code de récupération
          <input
            name="code"
            inputMode="numeric"
            pattern="[0-9]{8}"
            maxLength={8}
            placeholder="00000000"
            required
          />
        </label>
        <label>
          Nouveau mot de passe
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </label>
        <label>
          Confirmer
          <input
            name="confirmation"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </label>
        <fieldset className="device-choice compact">
          <legend>Type d'appareil</legend>
          <label>
            <input type="radio" name="deviceType" value="personal" defaultChecked />
            <span>
              <strong>Personnel</strong>
            </span>
          </label>
          <label>
            <input type="radio" name="deviceType" value="shared" />
            <span>
              <strong>Partagé</strong>
            </span>
          </label>
        </fieldset>
        <button className="primary-action" type="submit" disabled={submitting}>
          {submitting ? "Validation…" : "Changer mon mot de passe"}
        </button>
      </form>
      <div className="auth-links">
        <Link to="/connexion">Retour à la connexion</Link>
      </div>
    </AuthLayout>
  );
}
