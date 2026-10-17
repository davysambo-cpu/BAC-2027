import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";

import type {
  ActivateInvitationRequest,
  AuthResponse,
  CompletePasswordResetRequest,
  LoginRequest,
  ProfilePreferences,
  UpdateProfileRequest,
} from "@bac-2027/contracts";

import {
  activateInvitation,
  ApiClientError,
  completePasswordReset,
  getCurrentSession,
  getProfile,
  login,
  logout as logoutRequest,
  updateProfile as updateProfileRequest,
} from "./api";
import {
  cacheAuthentication,
  clearAuthenticationCache,
  clearPrivateOfflineData,
  readCachedAuthentication,
} from "../offline/database";
import { AuthContext, type AuthContextValue, type AuthState } from "./auth-context";

const defaultPreferences: ProfilePreferences = {
  dailyRevisionGoalMinutes: 45,
  downloadOnWifiOnly: true,
  reducedMotion: false,
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    preferences: defaultPreferences,
    session: null,
    offline: false,
  });

  const storeAuthentication = useCallback(
    async (authentication: AuthResponse, preferences: ProfilePreferences) => {
      if (authentication.session.deviceType === "personal") {
        await cacheAuthentication({
          key: "current",
          user: authentication.user,
          preferences,
          deviceType: authentication.session.deviceType,
          expiresAt: authentication.session.expiresAt,
        });
      } else {
        await clearPrivateOfflineData();
      }
      setState({
        status: "authenticated",
        user: authentication.user,
        preferences,
        session: authentication.session,
        offline: false,
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const [session, profile] = await Promise.all([getCurrentSession(), getProfile()]);
        if (cancelled) return;
        await storeAuthentication(session, profile.preferences);
      } catch (error) {
        if (cancelled) return;
        if (!(error instanceof ApiClientError)) {
          const cached = await readCachedAuthentication();
          if (cached) {
            setState({
              status: "authenticated",
              user: cached.user,
              preferences: cached.preferences,
              session: { deviceType: cached.deviceType, expiresAt: cached.expiresAt },
              offline: true,
            });
            return;
          }
        }
        if (error instanceof ApiClientError && error.status === 401) {
          await clearAuthenticationCache();
        }
        setState({
          status: "guest",
          user: null,
          preferences: defaultPreferences,
          session: null,
          offline: false,
        });
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [storeAuthentication]);

  useEffect(() => {
    if (state.status !== "authenticated" || state.session?.deviceType !== "personal") return;

    function handleOffline() {
      setState((current) =>
        current.status === "authenticated" && current.session?.deviceType === "personal"
          ? { ...current, offline: true }
          : current,
      );
    }

    async function handleOnline() {
      if (!state.offline) return;
      try {
        const [session, profile] = await Promise.all([getCurrentSession(), getProfile()]);
        await storeAuthentication(session, profile.preferences);
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          await clearAuthenticationCache();
          setState({
            status: "guest",
            user: null,
            preferences: defaultPreferences,
            session: null,
            offline: false,
          });
        }
      }
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [state.offline, state.session?.deviceType, state.status, storeAuthentication]);

  const completeAuthentication = useCallback(
    async (authentication: AuthResponse) => {
      const profile = await getProfile();
      await storeAuthentication(authentication, profile.preferences);
    },
    [storeAuthentication],
  );

  const signIn = useCallback(
    async (input: LoginRequest) => completeAuthentication(await login(input)),
    [completeAuthentication],
  );

  const activate = useCallback(
    async (input: ActivateInvitationRequest) =>
      completeAuthentication(await activateInvitation(input)),
    [completeAuthentication],
  );

  const resetPassword = useCallback(
    async (input: CompletePasswordResetRequest) =>
      completeAuthentication(await completePasswordReset(input)),
    [completeAuthentication],
  );

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      await clearPrivateOfflineData();
      setState({
        status: "guest",
        user: null,
        preferences: defaultPreferences,
        session: null,
        offline: false,
      });
    }
  }, []);

  const saveProfile = useCallback(
    async (input: UpdateProfileRequest) => {
      const profile = await updateProfileRequest(input);
      const nextState = { ...state, user: profile.user, preferences: profile.preferences };
      setState(nextState);
      if (nextState.session?.deviceType === "personal") {
        await cacheAuthentication({
          key: "current",
          user: profile.user,
          preferences: profile.preferences,
          deviceType: "personal",
          expiresAt: nextState.session.expiresAt,
        });
      }
    },
    [state],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, activate, resetPassword, signOut, saveProfile }),
    [activate, resetPassword, saveProfile, signIn, signOut, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
