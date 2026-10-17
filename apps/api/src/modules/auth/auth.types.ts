import type { DeviceType, ProfilePreferences, UserRole, UserStatus } from "@bac-2027/contracts";

export interface AccountRecord {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string | null;
  role: UserRole;
  status: UserStatus;
  seriesCode: string | null;
  preferences: ProfilePreferences;
}

export interface SessionRecord {
  id: string;
  tokenHash: string;
  deviceType: DeviceType;
  expiresAt: Date;
  user: AccountRecord;
}

export interface InvitationRecord {
  id: string;
  username: string;
  displayName: string;
  expiresAt: Date;
}

export interface PasswordResetRecord {
  id: string;
  username: string;
  expiresAt: Date;
}

export interface CreateInvitationRecord {
  username: string;
  displayName: string;
  tokenHash: string;
  createdBy: string;
  expiresAt: Date;
}

export interface ActivateInvitationRecord {
  tokenHash: string;
  passwordHash: string;
  now: Date;
  defaultPreferences: ProfilePreferences;
  storageQuotaBytes: number;
}

export interface CreateSessionRecord {
  userId: string;
  tokenHash: string;
  deviceType: DeviceType;
  expiresAt: Date;
  now: Date;
}

export interface CreateResetCodeRecord {
  userId: string;
  codeHash: string;
  createdBy: string;
  expiresAt: Date;
  now: Date;
}

export interface CompletePasswordResetRecord {
  userId: string;
  codeHash: string;
  passwordHash: string;
  now: Date;
}

export interface UpdateProfileRecord {
  userId: string;
  displayName: string;
  preferences: ProfilePreferences;
  now: Date;
}

export interface AuthRepository {
  findAccountByUsername(username: string): Promise<AccountRecord | null>;
  findAccountById(userId: string): Promise<AccountRecord | null>;
  createInvitation(input: CreateInvitationRecord): Promise<InvitationRecord | null>;
  activateInvitation(input: ActivateInvitationRecord): Promise<AccountRecord | null>;
  createSession(input: CreateSessionRecord): Promise<SessionRecord>;
  findSessionByTokenHash(tokenHash: string, now: Date): Promise<SessionRecord | null>;
  revokeSession(tokenHash: string, now: Date): Promise<void>;
  createResetCode(input: CreateResetCodeRecord): Promise<PasswordResetRecord | null>;
  completePasswordReset(input: CompletePasswordResetRecord): Promise<AccountRecord | null>;
  recordResetFailure(userId: string, now: Date): Promise<void>;
  updateProfile(input: UpdateProfileRecord): Promise<AccountRecord | null>;
  listAccounts(): Promise<AccountRecord[]>;
  updateAccountStatus(
    actorId: string,
    userId: string,
    status: "active" | "disabled",
    now: Date,
  ): Promise<AccountRecord | null>;
}
