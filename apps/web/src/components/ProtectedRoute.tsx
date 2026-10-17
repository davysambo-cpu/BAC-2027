import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../auth/auth-context";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") return <LoadingScreen />;
  if (auth.status === "guest") {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export function AdminRoute({ children }: PropsWithChildren) {
  const auth = useAuth();
  if (auth.status === "loading") return <LoadingScreen />;
  if (auth.status === "guest") return <Navigate to="/connexion" replace />;
  if (auth.user?.role !== "admin") return <Navigate to="/app" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <main className="loading-screen" aria-live="polite">
      <span className="loading-mark">B27</span>
      <p>Ouverture de votre espace…</p>
    </main>
  );
}
