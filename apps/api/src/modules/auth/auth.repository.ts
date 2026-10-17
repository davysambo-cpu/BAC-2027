import { and, asc, eq, gt, isNull, lt, sql } from "drizzle-orm";

import { profilePreferencesSchema, type ProfilePreferences } from "@bac-2027/contracts";

import type { AppDatabase } from "../../db/client";
import {
  adminAuditLogs,
  authSessions,
  invitations,
  passwordResetCodes,
  studentProfiles,
  users,
} from "../../db/schema";
import type {
  AccountRecord,
  ActivateInvitationRecord,
  AuthRepository,
  CompletePasswordResetRecord,
  CreateInvitationRecord,
  CreateResetCodeRecord,
  CreateSessionRecord,
  InvitationRecord,
  PasswordResetRecord,
  SessionRecord,
  UpdateProfileRecord,
} from "./auth.types";

const defaultPreferences: ProfilePreferences = {
  dailyRevisionGoalMinutes: 45,
  downloadOnWifiOnly: true,
  reducedMotion: false,
};

const accountSelection = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  passwordHash: users.passwordHash,
  role: users.role,
  status: users.status,
  seriesCode: studentProfiles.seriesCode,
  preferences: studentProfiles.preferences,
};

function mapAccount(row: {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string | null;
  role: "student" | "admin";
  status: "invited" | "active" | "disabled";
  seriesCode: string | null;
  preferences: Record<string, unknown> | null;
}): AccountRecord {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    passwordHash: row.passwordHash,
    role: row.role,
    status: row.status,
    seriesCode: row.seriesCode,
    preferences: profilePreferencesSchema.parse(row.preferences ?? defaultPreferences),
  };
}

export class DrizzleAuthRepository implements AuthRepository {
  constructor(private readonly database: AppDatabase) {}

  async findAccountByUsername(username: string): Promise<AccountRecord | null> {
    const [row] = await this.database
      .select(accountSelection)
      .from(users)
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(eq(users.username, username))
      .limit(1);
    return row ? mapAccount(row) : null;
  }

  async findAccountById(userId: string): Promise<AccountRecord | null> {
    const [row] = await this.database
      .select(accountSelection)
      .from(users)
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);
    return row ? mapAccount(row) : null;
  }

  async createInvitation(input: CreateInvitationRecord): Promise<InvitationRecord | null> {
    return this.database.transaction(async (transaction) => {
      const [existingUser] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);
      if (existingUser) return null;

      const now = new Date();
      await transaction
        .update(invitations)
        .set({ revokedAt: now })
        .where(
          and(
            eq(invitations.username, input.username),
            isNull(invitations.claimedAt),
            isNull(invitations.revokedAt),
          ),
        );

      const [created] = await transaction.insert(invitations).values(input).returning({
        id: invitations.id,
        username: invitations.username,
        displayName: invitations.displayName,
        expiresAt: invitations.expiresAt,
      });
      if (!created) return null;
      await transaction.insert(adminAuditLogs).values({
        actorId: input.createdBy,
        action: "invitation.created",
        targetType: "invitation",
        targetId: created.id,
        metadata: { username: created.username, expiresAt: created.expiresAt.toISOString() },
      });
      return created;
    });
  }

  async activateInvitation(input: ActivateInvitationRecord): Promise<AccountRecord | null> {
    return this.database.transaction(async (transaction) => {
      const [invitation] = await transaction
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.tokenHash, input.tokenHash),
            isNull(invitations.claimedAt),
            isNull(invitations.revokedAt),
            gt(invitations.expiresAt, input.now),
          ),
        )
        .limit(1);
      if (!invitation) return null;

      const [existingUser] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, invitation.username))
        .limit(1);
      if (existingUser) return null;

      const [createdUser] = await transaction
        .insert(users)
        .values({
          username: invitation.username,
          displayName: invitation.displayName,
          passwordHash: input.passwordHash,
          passwordChangedAt: input.now,
          role: "student",
          status: "active",
          storageQuotaBytes: input.storageQuotaBytes,
        })
        .returning({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          passwordHash: users.passwordHash,
          role: users.role,
          status: users.status,
        });
      if (!createdUser) return null;

      await transaction.insert(studentProfiles).values({
        userId: createdUser.id,
        seriesCode: "D",
        preferences: input.defaultPreferences,
      });
      await transaction
        .update(invitations)
        .set({ claimedAt: input.now })
        .where(and(eq(invitations.id, invitation.id), isNull(invitations.claimedAt)));

      return mapAccount({
        ...createdUser,
        seriesCode: "D",
        preferences: input.defaultPreferences,
      });
    });
  }

  async createSession(input: CreateSessionRecord): Promise<SessionRecord> {
    const [created] = await this.database
      .insert(authSessions)
      .values({
        userId: input.userId,
        tokenHash: input.tokenHash,
        deviceType: input.deviceType,
        expiresAt: input.expiresAt,
        lastUsedAt: input.now,
      })
      .returning({
        id: authSessions.id,
        tokenHash: authSessions.tokenHash,
        deviceType: authSessions.deviceType,
        expiresAt: authSessions.expiresAt,
      });
    if (!created) throw new Error("Unable to create authentication session.");

    const user = await this.findAccountById(input.userId);
    if (!user) throw new Error("Session user not found after creation.");
    return { ...created, user };
  }

  async findSessionByTokenHash(tokenHash: string, now: Date): Promise<SessionRecord | null> {
    const [row] = await this.database
      .select({
        sessionId: authSessions.id,
        tokenHash: authSessions.tokenHash,
        deviceType: authSessions.deviceType,
        expiresAt: authSessions.expiresAt,
        ...accountSelection,
      })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(
        and(
          eq(authSessions.tokenHash, tokenHash),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, now),
          eq(users.status, "active"),
        ),
      )
      .limit(1);
    if (!row) return null;

    await this.database
      .update(authSessions)
      .set({ lastUsedAt: now })
      .where(eq(authSessions.id, row.sessionId));

    return {
      id: row.sessionId,
      tokenHash: row.tokenHash,
      deviceType: row.deviceType,
      expiresAt: row.expiresAt,
      user: mapAccount(row),
    };
  }

  async revokeSession(tokenHash: string, now: Date): Promise<void> {
    await this.database
      .update(authSessions)
      .set({ revokedAt: now })
      .where(and(eq(authSessions.tokenHash, tokenHash), isNull(authSessions.revokedAt)));
  }

  async createResetCode(input: CreateResetCodeRecord): Promise<PasswordResetRecord | null> {
    return this.database.transaction(async (transaction) => {
      const [user] = await transaction
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(
          and(eq(users.id, input.userId), eq(users.role, "student"), eq(users.status, "active")),
        )
        .limit(1);
      if (!user) return null;

      await transaction
        .update(passwordResetCodes)
        .set({ revokedAt: input.now })
        .where(
          and(
            eq(passwordResetCodes.userId, input.userId),
            isNull(passwordResetCodes.usedAt),
            isNull(passwordResetCodes.revokedAt),
          ),
        );

      const [created] = await transaction
        .insert(passwordResetCodes)
        .values({
          userId: input.userId,
          codeHash: input.codeHash,
          createdBy: input.createdBy,
          expiresAt: input.expiresAt,
        })
        .returning({ id: passwordResetCodes.id, expiresAt: passwordResetCodes.expiresAt });
      if (!created) return null;
      await transaction.insert(adminAuditLogs).values({
        actorId: input.createdBy,
        action: "password_reset.created",
        targetType: "user",
        targetId: input.userId,
        metadata: { resetId: created.id, expiresAt: created.expiresAt.toISOString() },
      });
      return { ...created, username: user.username };
    });
  }

  async completePasswordReset(input: CompletePasswordResetRecord): Promise<AccountRecord | null> {
    return this.database.transaction(async (transaction) => {
      const [resetCode] = await transaction
        .select({ id: passwordResetCodes.id })
        .from(passwordResetCodes)
        .where(
          and(
            eq(passwordResetCodes.userId, input.userId),
            eq(passwordResetCodes.codeHash, input.codeHash),
            isNull(passwordResetCodes.usedAt),
            isNull(passwordResetCodes.revokedAt),
            gt(passwordResetCodes.expiresAt, input.now),
            lt(passwordResetCodes.failedAttempts, 5),
          ),
        )
        .limit(1);
      if (!resetCode) return null;

      await transaction
        .update(users)
        .set({
          passwordHash: input.passwordHash,
          passwordChangedAt: input.now,
          updatedAt: input.now,
        })
        .where(and(eq(users.id, input.userId), eq(users.status, "active")));
      await transaction
        .update(passwordResetCodes)
        .set({ usedAt: input.now })
        .where(eq(passwordResetCodes.id, resetCode.id));
      await transaction
        .update(authSessions)
        .set({ revokedAt: input.now })
        .where(and(eq(authSessions.userId, input.userId), isNull(authSessions.revokedAt)));

      const [row] = await transaction
        .select(accountSelection)
        .from(users)
        .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
        .where(eq(users.id, input.userId))
        .limit(1);
      return row ? mapAccount(row) : null;
    });
  }

  async recordResetFailure(userId: string, now: Date): Promise<void> {
    await this.database
      .update(passwordResetCodes)
      .set({ failedAttempts: sql`${passwordResetCodes.failedAttempts} + 1` })
      .where(
        and(
          eq(passwordResetCodes.userId, userId),
          isNull(passwordResetCodes.usedAt),
          isNull(passwordResetCodes.revokedAt),
          gt(passwordResetCodes.expiresAt, now),
        ),
      );
  }

  async updateProfile(input: UpdateProfileRecord): Promise<AccountRecord | null> {
    return this.database.transaction(async (transaction) => {
      await transaction
        .update(users)
        .set({ displayName: input.displayName, updatedAt: input.now })
        .where(and(eq(users.id, input.userId), eq(users.status, "active")));
      await transaction
        .update(studentProfiles)
        .set({
          preferences: input.preferences,
          updatedAt: input.now,
          version: sql`${studentProfiles.version} + 1`,
        })
        .where(eq(studentProfiles.userId, input.userId));

      const [row] = await transaction
        .select(accountSelection)
        .from(users)
        .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
        .where(eq(users.id, input.userId))
        .limit(1);
      return row ? mapAccount(row) : null;
    });
  }

  async listAccounts(): Promise<AccountRecord[]> {
    const rows = await this.database
      .select(accountSelection)
      .from(users)
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .orderBy(asc(users.displayName));
    return rows.map(mapAccount);
  }

  async updateAccountStatus(
    actorId: string,
    userId: string,
    status: "active" | "disabled",
    now: Date,
  ): Promise<AccountRecord | null> {
    const changed = await this.database.transaction(async (transaction) => {
      const [updated] = await transaction
        .update(users)
        .set({ status, disabledAt: status === "disabled" ? now : null, updatedAt: now })
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      if (!updated) return false;

      if (status === "disabled") {
        await transaction
          .update(authSessions)
          .set({ revokedAt: now })
          .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
      }
      await transaction.insert(adminAuditLogs).values({
        actorId,
        action: "user.status_updated",
        targetType: "user",
        targetId: userId,
        metadata: { status },
      });
      return true;
    });
    return changed ? this.findAccountById(userId) : null;
  }
}
