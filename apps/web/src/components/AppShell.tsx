import type { PropsWithChildren } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";

const studentNavigation = [
  { to: "/app", label: "Accueil", icon: "⌂", end: true },
  { to: "/ressources", label: "Ressources", icon: "▣" },
  { to: "/planning", label: "Planning", icon: "□" },
  { to: "/quiz", label: "Quiz", icon: "✓" },
  { to: "/profil", label: "Profil", icon: "○" },
];

export function AppShell({ children }: PropsWithChildren) {
  const auth = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await auth.signOut();
    navigate("/connexion", { replace: true });
  }

  return (
    <div className="product-shell">
      <aside className="product-sidebar">
        <NavLink className="app-brand app-brand-light sidebar-logo" to="/app">
          <span>B27</span>
          <strong>BAC-2027</strong>
        </NavLink>
        <nav aria-label="Navigation principale">
          {studentNavigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end ?? false}>
              <i aria-hidden="true">{item.icon}</i>
              <span>{item.label}</span>
            </NavLink>
          ))}
          {auth.user?.role === "admin" && (
            <NavLink to="/admin">
              <i aria-hidden="true">⚙</i>
              <span>Administration</span>
            </NavLink>
          )}
        </nav>
        <div className="sidebar-account">
          <span className="avatar">{initials(auth.user?.displayName)}</span>
          <div>
            <strong>{auth.user?.displayName}</strong>
            <small>{auth.user?.role === "admin" ? "Administrateur" : "Série D"}</small>
          </div>
          <button type="button" onClick={() => void signOut()} aria-label="Se déconnecter">
            ↪
          </button>
        </div>
      </aside>
      <div className="product-column">
        <header className="product-topbar">
          <NavLink className="app-brand mobile-product-logo" to="/app">
            <span>B27</span>
            <strong>BAC-2027</strong>
          </NavLink>
          <div className="topbar-spacer" />
          {auth.offline ? (
            <span className="network-state offline">Hors ligne</span>
          ) : (
            <span className="network-state online">Synchronisé</span>
          )}
          <NavLink className="avatar" to="/profil" aria-label="Ouvrir le profil">
            {initials(auth.user?.displayName)}
          </NavLink>
        </header>
        {auth.offline && (
          <div className="offline-notice" role="status">
            <strong>Mode hors ligne.</strong> Les données de cet appareil personnel restent
            accessibles.
          </div>
        )}
        <main className="product-content">{children}</main>
        <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
          {studentNavigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end ?? false}>
              <i aria-hidden="true">{item.icon}</i>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

function initials(name: string | undefined): string {
  if (!name) return "B27";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
