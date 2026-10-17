import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiClientError } from "../auth/api";
import { useAuth } from "../auth/auth-context";
import { AuthLayout } from "../components/AuthLayout";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (auth.status === "authenticated") navigate("/app", { replace: true });
  }, [auth.status, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await auth.signIn({
        username: String(form.get("username") ?? ""),
        password: String(form.get("password") ?? ""),
        deviceType: form.get("deviceType") === "shared" ? "shared" : "personal",
      });
      navigate("/app", { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : "Connexion impossible pour le moment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <p className="ui-eyebrow">Espace élève</p>
      <h2>Bienvenue</h2>
      <p className="auth-intro">
        Connectez-vous avec le nom d'utilisateur remis par l'administration.
      </p>
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      <form className="stack-form" onSubmit={(event) => void submit(event)}>
        <label>
          Nom d'utilisateur
          <input name="username" autoComplete="username" required minLength={3} />
        </label>
        <label>
          Mot de passe
          <div className="password-input">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? "Masquer" : "Afficher"}
            </button>
          </div>
        </label>
        <fieldset className="device-choice">
          <legend>Cet appareil est-il personnel ?</legend>
          <label>
            <input type="radio" name="deviceType" value="personal" defaultChecked />
            <span>
              <strong>Appareil personnel</strong>
              <small>Session de 30 jours et accès hors ligne.</small>
            </span>
          </label>
          <label>
            <input type="radio" name="deviceType" value="shared" />
            <span>
              <strong>Appareil partagé</strong>
              <small>Session courte et aucune donnée privée conservée durablement.</small>
            </span>
          </label>
        </fieldset>
        <button className="primary-action" type="submit" disabled={submitting}>
          {submitting ? "Connexion…" : "Se connecter"}
        </button>
      </form>
      <div className="auth-links">
        <Link to="/recuperation">J'ai reçu un code de récupération</Link>
        <span>·</span>
        <span>Nouveau ? Utilisez votre lien d'invitation.</span>
      </div>
    </AuthLayout>
  );
}
