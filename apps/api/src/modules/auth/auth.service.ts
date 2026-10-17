import { createHmac, randomBytes, randomInt } from "node:crypto";

import { argon2id, hash as hashPasswordWithArgon, verify as verifyPasswordWithArgon } from "argon2";

import type {
  AuthResponse,
  CompletePasswordResetRequest,
  CreateInvitationRequest,
  CurrentUser,
  DeviceType,
  LoginRequest,
  ProfilePreferences,
  UpdateProfileRequest,
} from "@bac-2027/contracts";

import type { Environment } from "../../config/env";
import { ApplicationError } from "../../lib/errors";
import type { AccountRecord, AuthRepository, SessionRecord } from "./auth.types";

const defaultPreferences: ProfilePreferences = {
  dailyRevisionGoalMinutes: 45,
  downloadOnWifiOnly: true,
  reducedMotion: false,
};

export interface AuthenticationResult extends AuthResponse {
  sessionToken: string;
}

export interface AuthenticatedSession {
  user: CurrentUser;
  preferences: ProfilePreferences;
  session: {
    tokenHash: string;
    deviceType: DeviceType;
    expiresAt: Date;
  };
}

type AuthConfiguration = Pick<
  Environment,
  | "AUTH_TOKEN_SECRET"
  | "INVITATION_TTL_HOURS"
  | "RESET_CODE_TTL_MINUTES"
  | "PERSONAL_SESSION_TTL_DAYS"
  | "SHARED_SESSION_TTL_HOURS"
  | "DEFAULT_USER_STORAGE_QUOTA_MB"
>;

export class AuthService {
  private readonly dummyPasswordHash: Promise<string>;

  constructor(
    private readonly repository: AuthRepository,
    private readonly configuration: AuthConfiguration,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.dummyPasswordHash = this.hashPassword("not-a-valid-user-password-2027");
  }

  async login(input: LoginRequest): Promise<AuthenticationResult> {
    const account = await this.repository.findAccountByUsername(input.username);
    const candidateHash = account?.passwordHash ?? (await this.dummyPasswordHash);
    const passwordValid = await verifyPasswordWithArgon(candidateHash, input.password).catch(
      () => false,
    );

    if (!account || !passwordValid || !account.passwordHash || account.status === "invited") {
      throw new ApplicationError(
        "INVALID_CREDENTIALS",
        "Nom d'utilisateur ou mot de passe incorrect.",
        401,
      );
    }
    if (account.status === "disabled") {
      throw new ApplicationError(
        "ACCOUNT_DISABLED",
        "Ce compte est désactivé. Contactez l'administration.",
        403,
      );
    }

    return this.issueSession(account, input.deviceType);
  }

  async createInvitation(actor: CurrentUser, input: CreateInvitationRequest) {
    this.requireAdmin(actor);
    const rawToken = randomBytes(32).toString("base64url");
    const now = this.now();
    const expiresAt = new Date(
      now.getTime() + this.configuration.INVITATION_TTL_HOURS * 60 * 60 * 1000,
    );
    const created = await this.repository.createInvitation({
      username: input.username,
      displayName: input.displayName,
      tokenHash: this.hashToken("invitation", rawToken),
      createdBy: actor.id,
      expiresAt,
    });
    if (!created) {
      throw new ApplicationError(
        "USERNAME_UNAVAILABLE",
        "Ce nom d'utilisateur est déjà utilisé.",
        409,
      );
    }

    return {
      id: created.id,
      username: created.username,
      displayName: created.displayName,
      activationPath: `/activation?token=${encodeURIComponent(rawToken)}`,
      expiresAt: created.expiresAt.toISOString(),
    };
  }

  async activateInvitation(
    token: string,
    password: string,
    deviceType: DeviceType,
  ): Promise<AuthenticationResult> {
    const now = this.now();
    const account = await this.repository.activateInvitation({
      tokenHash: this.hashToken("invitation", token),
      passwordHash: await this.hashPassword(password),
      now,
      defaultPreferences,
      storageQuotaBytes: this.configuration.DEFAULT_USER_STORAGE_QUOTA_MB * 1024 * 1024,
    });
    if (!account) {
      throw new ApplicationError(
        "INVALID_INVITATION",
        "Ce lien d'invitation est invalide, expiré ou déjà utilisé.",
        400,
      );
    }
    return this.issueSession(account, deviceType);
  }

  async authenticate(sessionToken: string | undefined): Promise<AuthenticatedSession> {
    if (!sessionToken) {
      throw new ApplicationError("UNAUTHENTICATED", "Connectez-vous pour continuer.", 401);
    }
    const tokenHash = this.hashToken("session", sessionToken);
    const session = await this.repository.findSessionByTokenHash(tokenHash, this.now());
    if (!session) {
      throw new ApplicationError(
        "UNAUTHENTICATED",
        "Votre session a expiré. Connectez-vous à nouveau.",
        401,
      );
    }
    return this.mapAuthenticatedSession(session);
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) return;
    await this.repository.revokeSession(this.hashToken("session", sessionToken), this.now());
  }

  async createResetCode(actor: CurrentUser, userId: string) {
    this.requireAdmin(actor);
    const code = randomInt(10_000_000, 100_000_000).toString();
    const now = this.now();
    const expiresAt = new Date(
      now.getTime() + this.configuration.RESET_CODE_TTL_MINUTES * 60 * 1000,
    );
    const reset = await this.repository.createResetCode({
      userId,
      codeHash: this.hashToken(`reset:${userId}`, code),
      createdBy: actor.id,
      expiresAt,
      now,
    });
    if (!reset) {
      throw new ApplicationError("NOT_FOUND", "Compte élève introuvable ou inactif.", 404);
    }
    return { username: reset.username, code, expiresAt: reset.expiresAt.toISOString() };
  }

  async completePasswordReset(input: CompletePasswordResetRequest): Promise<AuthenticationResult> {
    const existing = await this.repository.findAccountByUsername(input.username);
    if (!existing || existing.status !== "active") {
      throw new ApplicationError("INVALID_RESET_CODE", "Le code est incorrect ou a expiré.", 400);
    }
    const now = this.now();
    const account = await this.repository.completePasswordReset({
      userId: existing.id,
      codeHash: this.hashToken(`reset:${existing.id}`, input.code),
      passwordHash: await this.hashPassword(input.password),
      now,
    });
    if (!account) {
      await this.repository.recordResetFailure(existing.id, now);
      throw new ApplicationError("INVALID_RESET_CODE", "Le code est incorrect ou a expiré.", 400);
    }
    return this.issueSession(account, input.deviceType);
  }

  async updateProfile(
    session: AuthenticatedSession,
    input: UpdateProfileRequest,
  ): Promise<{ user: CurrentUser; preferences: ProfilePreferences }> {
    const account = await this.repository.updateProfile({
      userId: session.user.id,
      displayName: input.displayName,
      preferences: input.preferences,
      now: this.now(),
    });
    if (!account) {
      throw new ApplicationError("NOT_FOUND", "Profil introuvable.", 404);
    }
    return { user: this.toCurrentUser(account), preferences: account.preferences };
  }

  async listAccounts(actor: CurrentUser): Promise<CurrentUser[]> {
    this.requireAdmin(actor);
    return (await this.repository.listAccounts()).map((account) => this.toCurrentUser(account));
  }

  async updateAccountStatus(
    actor: CurrentUser,
    userId: string,
    status: "active" | "disabled",
  ): Promise<CurrentUser> {
    this.requireAdmin(actor);
    if (actor.id === userId && status === "disabled") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Un administrateur ne peut pas désactiver son propre compte.",
        400,
      );
    }
    const account = await this.repository.updateAccountStatus(actor.id, userId, status, this.now());
    if (!account) throw new ApplicationError("NOT_FOUND", "Compte introuvable.", 404);
    return this.toCurrentUser(account);
  }

  private async issueSession(
    account: AccountRecord,
    deviceType: DeviceType,
  ): Promise<AuthenticationResult> {
    const sessionToken = randomBytes(48).toString("base64url");
    const now = this.now();
    const duration =
      deviceType === "personal"
        ? this.configuration.PERSONAL_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
        : this.configuration.SHARED_SESSION_TTL_HOURS * 60 * 60 * 1000;
    const expiresAt = new Date(now.getTime() + duration);
    await this.repository.createSession({
      userId: account.id,
      tokenHash: this.hashToken("session", sessionToken),
      deviceType,
      expiresAt,
      now,
    });
    return {
      sessionToken,
      user: this.toCurrentUser(account),
      session: { deviceType, expiresAt: expiresAt.toISOString() },
    };
  }

  private mapAuthenticatedSession(session: SessionRecord): AuthenticatedSession {
    return {
      user: this.toCurrentUser(session.user),
      preferences: session.user.preferences,
      session: {
        tokenHash: session.tokenHash,
        deviceType: session.deviceType,
        expiresAt: session.expiresAt,
      },
    };
  }

  private toCurrentUser(account: AccountRecord): CurrentUser {
    return {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      role: account.role,
      status: account.status,
      seriesCode: account.seriesCode,
    };
  }

  private requireAdmin(user: CurrentUser): void {
    if (user.role !== "admin") {
      throw new ApplicationError("FORBIDDEN", "Cette action est réservée à l'administration.", 403);
    }
  }

  private hashToken(purpose: string, value: string): string {
    return createHmac("sha256", this.configuration.AUTH_TOKEN_SECRET)
      .update(`${purpose}:${value}`)
      .digest("hex");
  }

  private hashPassword(password: string): Promise<string> {
    return hashPasswordWithArgon(password, {
      type: argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }
}
