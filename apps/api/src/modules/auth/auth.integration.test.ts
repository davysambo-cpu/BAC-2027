import { randomUUID } from "node:crypto";

import { argon2id, hash } from "argon2";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app";
import { readEnvironment } from "../../config/env";
import { createDatabaseConnection, type DatabaseConnection } from "../../db/client";
import { adminAuditLogs, users } from "../../db/schema";
import { DrizzleAuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";

const connections: DatabaseConnection[] = [];

function sessionCookie(response: {
  headers: Record<string, string | string[] | number | undefined>;
}): string {
  const header = response.headers["set-cookie"];
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== "string") throw new Error("Missing session cookie");
  return value.split(";", 1)[0] ?? "";
}

afterEach(async () => {
  await Promise.all(connections.splice(0).map((connection) => connection.close()));
});

describe("authentication lifecycle", () => {
  it("invites, activates, authenticates, updates and resets an account", async () => {
    const environment = readEnvironment({
      NODE_ENV: "test",
      DATABASE_DRIVER: "pglite",
      PGLITE_DATA_DIR: "memory://",
      AUTH_TOKEN_SECRET: "test-only-auth-token-secret-with-32-characters",
      EMBEDDED_PREVIEW_MODE: "true",
    });
    const connection = await createDatabaseConnection(environment);
    connections.push(connection);

    const adminPassword = "Admin-BAC-2027";
    const adminId = randomUUID();
    await connection.database.insert(users).values({
      id: adminId,
      username: "admin",
      displayName: "Administrateur",
      passwordHash: await hash(adminPassword, {
        type: argon2id,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
      }),
      passwordChangedAt: new Date(),
      role: "admin",
      status: "active",
    });

    const repository = new DrizzleAuthRepository(connection.database);
    const service = new AuthService(repository, environment);
    const app = buildApp({ logger: false }, { authService: service, environment });

    try {
      const adminLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { username: "admin", password: adminPassword, deviceType: "personal" },
      });
      expect(adminLogin.statusCode).toBe(200);
      expect(String(adminLogin.headers["set-cookie"])).toContain("HttpOnly");
      expect(String(adminLogin.headers["set-cookie"])).toContain("Expires=");
      expect(String(adminLogin.headers["set-cookie"])).toContain("Secure");
      expect(String(adminLogin.headers["set-cookie"])).toContain("Partitioned");
      expect(String(adminLogin.headers["set-cookie"])).toContain("SameSite=None");
      const adminAuthentication = adminLogin.json<{ sessionAccessToken: string }>();
      expect(adminAuthentication.sessionAccessToken).toHaveLength(64);
      const adminCookie = sessionCookie(adminLogin);

      const previewHeaderAdminAccess = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users",
        headers: { "x-bac-preview-session": adminAuthentication.sessionAccessToken },
      });
      expect(previewHeaderAdminAccess.statusCode).toBe(200);

      const unknownLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { username: "inconnu", password: "Erreur-BAC-2027", deviceType: "shared" },
      });
      const wrongPassword = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { username: "admin", password: "Erreur-BAC-2027", deviceType: "shared" },
      });
      expect(unknownLogin.statusCode).toBe(401);
      expect(unknownLogin.json()).toMatchObject({ error: { code: "INVALID_CREDENTIALS" } });
      expect(wrongPassword.json()).toMatchObject({ error: { code: "INVALID_CREDENTIALS" } });

      const invitation = await app.inject({
        method: "POST",
        url: "/api/v1/admin/invitations",
        headers: { cookie: adminCookie },
        payload: { username: "awa07", displayName: "Awa K." },
      });
      expect(invitation.statusCode).toBe(201);
      const invitationBody = invitation.json<{ activationPath: string }>();
      const invitationToken = new URL(
        invitationBody.activationPath,
        "https://bac-2027.test",
      ).searchParams.get("token");
      expect(invitationToken).toBeTruthy();

      const replacementInvitation = await app.inject({
        method: "POST",
        url: "/api/v1/admin/invitations",
        headers: { cookie: adminCookie },
        payload: { username: "awa07", displayName: "Awa K." },
      });
      expect(replacementInvitation.statusCode).toBe(201);
      const replacementToken = new URL(
        replacementInvitation.json<{ activationPath: string }>().activationPath,
        "https://bac-2027.test",
      ).searchParams.get("token");

      const revokedActivation = await app.inject({
        method: "POST",
        url: "/api/v1/auth/activate",
        payload: {
          token: invitationToken,
          password: "Eleve-BAC-2027",
          deviceType: "personal",
        },
      });
      expect(revokedActivation.statusCode).toBe(400);

      const activation = await app.inject({
        method: "POST",
        url: "/api/v1/auth/activate",
        payload: {
          token: replacementToken,
          password: "Eleve-BAC-2027",
          deviceType: "personal",
        },
      });
      expect(activation.statusCode).toBe(200);
      const studentCookie = sessionCookie(activation);
      const student = activation.json<{ user: { id: string; username: string } }>().user;
      expect(student.username).toBe("awa07");

      const forbiddenAdminAccess = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users",
        headers: { cookie: studentCookie },
      });
      expect(forbiddenAdminAccess.statusCode).toBe(403);
      expect(forbiddenAdminAccess.json()).toMatchObject({ error: { code: "FORBIDDEN" } });

      const profile = await app.inject({
        method: "PATCH",
        url: "/api/v1/profile",
        headers: { cookie: studentCookie },
        payload: {
          displayName: "Awa Koné",
          preferences: {
            dailyRevisionGoalMinutes: 60,
            downloadOnWifiOnly: true,
            reducedMotion: false,
          },
        },
      });
      expect(profile.statusCode).toBe(200);
      expect(profile.json()).toMatchObject({
        user: { displayName: "Awa Koné", seriesCode: "D" },
        preferences: { dailyRevisionGoalMinutes: 60 },
      });

      const persistedProfile = await app.inject({
        method: "GET",
        url: "/api/v1/profile",
        headers: { cookie: studentCookie },
      });
      expect(persistedProfile.json()).toMatchObject({
        user: { displayName: "Awa Koné" },
        preferences: { dailyRevisionGoalMinutes: 60 },
      });

      const reset = await app.inject({
        method: "POST",
        url: "/api/v1/admin/reset-codes",
        headers: { cookie: adminCookie },
        payload: { userId: student.id },
      });
      expect(reset.statusCode).toBe(201);
      const resetCode = reset.json<{ code: string }>().code;
      expect(resetCode).toMatch(/^\d{8}$/);

      const rejectedReset = await app.inject({
        method: "POST",
        url: "/api/v1/auth/reset/complete",
        payload: {
          username: "awa07",
          code: "00000000",
          password: "Nouveau-BAC-2027",
          deviceType: "shared",
        },
      });
      expect(rejectedReset.statusCode).toBe(400);
      expect(rejectedReset.json()).toMatchObject({ error: { code: "INVALID_RESET_CODE" } });

      const completedReset = await app.inject({
        method: "POST",
        url: "/api/v1/auth/reset/complete",
        payload: {
          username: "awa07",
          code: resetCode,
          password: "Nouveau-BAC-2027",
          deviceType: "shared",
        },
      });
      expect(completedReset.statusCode).toBe(200);
      expect(completedReset.json()).toMatchObject({ session: { deviceType: "shared" } });
      expect(String(completedReset.headers["set-cookie"])).not.toContain("Expires=");

      const oldSession = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { cookie: studentCookie },
      });
      expect(oldSession.statusCode).toBe(401);

      const newLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { username: "awa07", password: "Nouveau-BAC-2027", deviceType: "personal" },
      });
      expect(newLogin.statusCode).toBe(200);
      const newStudentCookie = sessionCookie(newLogin);

      const disabledAccount = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${student.id}/status`,
        headers: { cookie: adminCookie },
        payload: { status: "disabled" },
      });
      expect(disabledAccount.json()).toMatchObject({ status: "disabled" });
      const revokedAfterDisable = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { cookie: newStudentCookie },
      });
      expect(revokedAfterDisable.statusCode).toBe(401);

      const reactivatedAccount = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${student.id}/status`,
        headers: { cookie: adminCookie },
        payload: { status: "active" },
      });
      expect(reactivatedAccount.json()).toMatchObject({ status: "active" });

      const lastAllowedLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { username: "inconnu", password: "Erreur-BAC-2027", deviceType: "shared" },
      });
      const rateLimitedLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { username: "inconnu", password: "Erreur-BAC-2027", deviceType: "shared" },
      });
      expect(lastAllowedLogin.statusCode).toBe(401);
      expect(rateLimitedLogin.statusCode).toBe(429);
      expect(rateLimitedLogin.json()).toMatchObject({ error: { code: "RATE_LIMITED" } });

      const auditEntries = await connection.database
        .select({ action: adminAuditLogs.action, metadata: adminAuditLogs.metadata })
        .from(adminAuditLogs);
      expect(auditEntries.map((entry) => entry.action)).toEqual(
        expect.arrayContaining([
          "invitation.created",
          "password_reset.created",
          "user.status_updated",
        ]),
      );
      expect(JSON.stringify(auditEntries)).not.toContain(resetCode);
    } finally {
      await app.close();
    }
  }, 30_000);
});
