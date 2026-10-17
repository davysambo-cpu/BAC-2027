import { createContext, useContext } from "react";

import type {
  ActivateInvitationRequest,
  AuthResponse,
  CompletePasswordResetRequest,
  CurrentUser,
  LoginRequest,
  ProfilePreferences,
  UpdateProfileRequest,
} from "@bac-2027/contracts";

export type AuthStatus = "loading" | "guest" | "authenticated";

export interface AuthState {
  status: AuthStatus;
  user: CurrentUser | null;
  preferences: ProfilePreferences;
  session: AuthResponse["session"] | null;
  offline: boolean;
}

export interface AuthContextValue extends AuthState {
  signIn: (input: LoginRequest) => Promise<void>;
  activate: (input: ActivateInvitationRequest) => Promise<void>;
  resetPassword: (input: CompletePasswordResetRequest) => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (input: UpdateProfileRequest) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
