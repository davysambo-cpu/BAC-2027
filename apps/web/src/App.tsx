import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import { AdminRoute, ProtectedRoute } from "./components/ProtectedRoute";
import { ActivationPage } from "./pages/ActivationPage";
import { AdminPage } from "./pages/AdminPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RecoveryPage } from "./pages/RecoveryPage";

const ResourcesPage = lazy(() => import("./pages/ResourcesPage"));

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/activation" element={<ActivationPage />} />
          <Route path="/recuperation" element={<RecoveryPage />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profil"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ressources"
            element={
              <ProtectedRoute>
                <Suspense
                  fallback={<div className="route-loading">Chargement des ressources…</div>}
                >
                  <ResourcesPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/planning"
            element={
              <ProtectedRoute>
                <PlaceholderPage
                  eyebrow="Votre rythme"
                  title="Planning"
                  description="Les séances et rappels de révision seront rassemblés ici."
                  nextPart="la Partie 6"
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz"
            element={
              <ProtectedRoute>
                <PlaceholderPage
                  eyebrow="S'entraîner"
                  title="Quiz"
                  description="Les quiz et résultats détaillés seront disponibles ici."
                  nextPart="la Partie 7"
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
