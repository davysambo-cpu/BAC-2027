import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Présentation de BAC-2027">
        <Link className="app-brand app-brand-light" to="/connexion" aria-label="BAC-2027">
          <span>B27</span>
          <strong>BAC-2027</strong>
        </Link>
        <div className="auth-story-copy">
          <p className="ui-eyebrow">Votre année, bien organisée</p>
          <h1>Tout ce qu'il faut pour avancer jusqu'au BAC.</h1>
          <p>
            Rassemblez vos cours, planifiez vos révisions et mesurez vos progrès, même lorsque la
            connexion est instable.
          </p>
        </div>
        <ul className="auth-points">
          <li>
            <span>01</span>
            <div>
              <strong>Classeur personnel</strong>
              <small>Vos cours restent privés et organisés.</small>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Révision régulière</strong>
              <small>Planning, quiz et progression au même endroit.</small>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Mode hors ligne</strong>
              <small>Votre travail reste disponible sur un appareil personnel.</small>
            </div>
          </li>
        </ul>
        <p className="auth-story-foot">Série D · Burkina Faso</p>
      </section>
      <section className="auth-form-side">
        <Link className="app-brand auth-mobile-logo" to="/connexion" aria-label="BAC-2027">
          <span>B27</span>
          <strong>BAC-2027</strong>
        </Link>
        <div className="auth-card">{children}</div>
        <p className="auth-privacy">
          Accès privé sur invitation · Aucune coordonnée personnelle requise
        </p>
      </section>
    </main>
  );
}
