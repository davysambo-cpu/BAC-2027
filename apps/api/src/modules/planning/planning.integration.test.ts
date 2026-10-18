import { randomUUID } from "node:crypto";

import { argon2id, hash } from "argon2";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { revisionSessionListResponseSchema, revisionSessionSchema } from "@bac-2027/contracts";

import { buildApp } from "../../app";
import { readEnvironment } from "../../config/env";
import { createDatabaseConnection, type DatabaseConnection } from "../../db/client";
import { catalogueItems, studentProfiles, users } from "../../db/schema";
import { DrizzleAuthRepository } from "../auth/auth.repository";
import { AuthService } from "../auth/auth.service";
import { importInitialCatalogue } from "../catalogue/catalogue.import";
import { DrizzlePlanningRepository } from "./planning.repository";
import { PlanningService } from "./planning.service";

const connections: DatabaseConnection[] = [];

afterEach(async () => {
  await Promise.all(connections.splice(0).map((connection) => connection.close()));
});

describe("personal revision planning", () => {
  it("creates, updates, completes and deletes private sessions with version checks", async () => {
    const environment = readEnvironment({
      NODE_ENV: "test",
      DATABASE_DRIVER: "pglite",
      PGLITE_DATA_DIR: "memory://",
      AUTH_TOKEN_SECRET: "test-only-auth-token-secret-with-32-characters",
    });
    const connection = await createDatabaseConnection(environment);
    connections.push(connection);
    await importInitialCatalogue(connection.database);

    const password = "Planning-BAC-2027";
    const passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    const firstStudentId = randomUUID();
    const secondStudentId = randomUUID();
    await connection.database.insert(users).values([
      {
        id: firstStudentId,
        username: "planning-eleve-a",
        displayName: "Élève Planning A",
        passwordHash,
        passwordChangedAt: new Date(),
        role: "student",
        status: "active",
      },
      {
        id: secondStudentId,
        username: "planning-eleve-b",
        displayName: "Élève Planning B",
        passwordHash,
        passwordChangedAt: new Date(),
        role: "student",
        status: "active",
      },
    ]);
    await connection.database.insert(studentProfiles).values([
      { userId: firstStudentId, seriesCode: "D" },
      { userId: secondStudentId, seriesCode: "D" },
    ]);

    let currentDate = new Date("2026-10-17T14:00:00.000Z");
    const authService = new AuthService(
      new DrizzleAuthRepository(connection.database),
      environment,
    );
    const planningService = new PlanningService(
      new DrizzlePlanningRepository(connection.database),
      () => new Date(currentDate),
    );
    const app = buildApp({ logger: false }, { authService, planningService, environment });

    async function login(username: string): Promise<string> {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { username, password, deviceType: "personal" },
      });
      const header = response.headers["set-cookie"];
      const cookie = (Array.isArray(header) ? header[0] : header)?.split(";", 1)[0];
      if (!cookie) throw new Error("The test session cookie was not created.");
      return cookie;
    }

    try {
      const firstCookie = await login("planning-eleve-a");
      const secondCookie = await login("planning-eleve-b");
      const repository = new DrizzlePlanningRepository(connection.database);
      const mathematics = await repository.subjectIsVisible("D", randomUUID());
      expect(mathematics).toBe(false);

      const [topic] = await connection.database
        .select({ id: catalogueItems.id, subjectId: catalogueItems.subjectId })
        .from(catalogueItems)
        .where(eq(catalogueItems.seriesDScope, "unspecified"))
        .limit(1);
      expect(topic).toBeTruthy();

      const initialResponse = await app.inject({
        method: "GET",
        url: "/api/v1/planning/sessions",
        headers: { cookie: firstCookie },
      });
      expect(initialResponse.statusCode).toBe(200);
      expect(revisionSessionListResponseSchema.parse(initialResponse.json()).sessions).toEqual([]);

      const sessionId = randomUUID();
      const createPayload = {
        id: sessionId,
        subjectId: topic!.subjectId,
        catalogueItemId: topic!.id,
        title: "Revoir le cours du jour",
        notes: "Relire puis restituer sans regarder.",
        scheduledAt: "2026-10-18T17:00:00.000Z",
        durationMinutes: 45,
      };
      const missingHeaderResponse = await app.inject({
        method: "POST",
        url: "/api/v1/planning/sessions",
        headers: { cookie: firstCookie },
        payload: createPayload,
      });
      expect(missingHeaderResponse.statusCode).toBe(400);
      expect(missingHeaderResponse.json()).toMatchObject({
        error: { code: "PLANNING_WRITE_HEADER_REQUIRED" },
      });

      const createResponse = await app.inject({
        method: "POST",
        url: "/api/v1/planning/sessions",
        headers: { cookie: firstCookie, "x-bac-planning": "1" },
        payload: createPayload,
      });
      expect(createResponse.statusCode).toBe(201);
      const created = revisionSessionSchema.parse(createResponse.json());
      expect(created).toMatchObject({
        id: sessionId,
        subjectId: topic!.subjectId,
        catalogueItemId: topic!.id,
        status: "planned",
        version: 1,
      });

      const retryResponse = await app.inject({
        method: "POST",
        url: "/api/v1/planning/sessions",
        headers: { cookie: firstCookie, "x-bac-planning": "1" },
        payload: createPayload,
      });
      expect(retryResponse.statusCode).toBe(201);
      expect(revisionSessionSchema.parse(retryResponse.json()).id).toBe(sessionId);

      const changedRetryResponse = await app.inject({
        method: "POST",
        url: "/api/v1/planning/sessions",
        headers: { cookie: firstCookie, "x-bac-planning": "1" },
        payload: { ...createPayload, title: "Une autre séance avec le même identifiant" },
      });
      expect(changedRetryResponse.statusCode).toBe(409);
      expect(changedRetryResponse.json()).toMatchObject({
        error: { code: "RESOURCE_VERSION_CONFLICT" },
      });

      const foreignIdentifierResponse = await app.inject({
        method: "POST",
        url: "/api/v1/planning/sessions",
        headers: { cookie: secondCookie, "x-bac-planning": "1" },
        payload: createPayload,
      });
      expect(foreignIdentifierResponse.statusCode).toBe(409);

      const privateListResponse = await app.inject({
        method: "GET",
        url: "/api/v1/planning/sessions",
        headers: { cookie: secondCookie },
      });
      expect(revisionSessionListResponseSchema.parse(privateListResponse.json()).sessions).toEqual(
        [],
      );

      const updatePayload = {
        ...createPayload,
        title: "Revoir le cours et refaire un exercice",
        scheduledAt: "2026-10-18T18:00:00.000Z",
        durationMinutes: 60,
        status: "planned" as const,
        version: 1,
      };
      const updateResponse = await app.inject({
        method: "PATCH",
        url: `/api/v1/planning/sessions/${sessionId}`,
        headers: { cookie: firstCookie, "x-bac-planning": "1" },
        payload: updatePayload,
      });
      expect(updateResponse.statusCode).toBe(200);
      expect(revisionSessionSchema.parse(updateResponse.json())).toMatchObject({
        title: updatePayload.title,
        durationMinutes: 60,
        version: 2,
      });

      const retriedUpdateResponse = await app.inject({
        method: "PATCH",
        url: `/api/v1/planning/sessions/${sessionId}`,
        headers: { cookie: firstCookie, "x-bac-planning": "1" },
        payload: updatePayload,
      });
      expect(retriedUpdateResponse.statusCode).toBe(200);
      expect(revisionSessionSchema.parse(retriedUpdateResponse.json()).version).toBe(2);

      const foreignUpdateResponse = await app.inject({
        method: "PATCH",
        url: `/api/v1/planning/sessions/${sessionId}`,
        headers: { cookie: secondCookie, "x-bac-planning": "1" },
        payload: { ...updatePayload, version: 2 },
      });
      expect(foreignUpdateResponse.statusCode).toBe(404);

      currentDate = new Date("2026-10-18T19:00:00.000Z");
      const completeResponse = await app.inject({
        method: "PATCH",
        url: `/api/v1/planning/sessions/${sessionId}`,
        headers: { cookie: firstCookie, "x-bac-planning": "1" },
        payload: { ...updatePayload, status: "completed", version: 2 },
      });
      expect(completeResponse.statusCode).toBe(200);
      const completed = revisionSessionSchema.parse(completeResponse.json());
      expect(completed).toMatchObject({ status: "completed", version: 3 });
      expect(completed.completedAt).toBe("2026-10-18T19:00:00.000Z");

      currentDate = new Date("2026-10-18T20:00:00.000Z");
      const editCompletedResponse = await app.inject({
        method: "PATCH",
        url: `/api/v1/planning/sessions/${sessionId}`,
        headers: { cookie: firstCookie, "x-bac-planning": "1" },
        payload: {
          ...updatePayload,
          status: "completed",
          notes: "Séance terminée et vérifiée.",
          version: 3,
        },
      });
      expect(editCompletedResponse.statusCode).toBe(200);
      expect(revisionSessionSchema.parse(editCompletedResponse.json())).toMatchObject({
        status: "completed",
        completedAt: "2026-10-18T19:00:00.000Z",
        version: 4,
      });

      const conflictResponse = await app.inject({
        method: "PATCH",
        url: `/api/v1/planning/sessions/${sessionId}`,
        headers: { cookie: firstCookie, "x-bac-planning": "1" },
        payload: { ...updatePayload, version: 2 },
      });
      expect(conflictResponse.statusCode).toBe(409);
      expect(conflictResponse.json()).toMatchObject({
        error: { code: "RESOURCE_VERSION_CONFLICT" },
      });

      const deleteResponse = await app.inject({
        method: "DELETE",
        url: `/api/v1/planning/sessions/${sessionId}`,
        headers: { cookie: firstCookie, "x-bac-planning": "1" },
        payload: { version: 4 },
      });
      expect(deleteResponse.statusCode).toBe(204);

      const retriedDeleteResponse = await app.inject({
        method: "DELETE",
        url: `/api/v1/planning/sessions/${sessionId}`,
        headers: { cookie: firstCookie, "x-bac-planning": "1" },
        payload: { version: 4 },
      });
      expect(retriedDeleteResponse.statusCode).toBe(204);

      const finalResponse = await app.inject({
        method: "GET",
        url: "/api/v1/planning/sessions",
        headers: { cookie: firstCookie },
      });
      expect(revisionSessionListResponseSchema.parse(finalResponse.json()).sessions).toEqual([]);

      const topicWithoutSubjectResponse = await app.inject({
        method: "POST",
        url: "/api/v1/planning/sessions",
        headers: { cookie: firstCookie, "x-bac-planning": "1" },
        payload: {
          ...createPayload,
          id: randomUUID(),
          subjectId: null,
        },
      });
      expect(topicWithoutSubjectResponse.statusCode).toBe(400);

      const [hiddenTopic] = await connection.database
        .select({ id: catalogueItems.id, subjectId: catalogueItems.subjectId })
        .from(catalogueItems)
        .where(eq(catalogueItems.seriesDScope, "explicitly_excludes"))
        .limit(1);
      const hiddenResponse = await app.inject({
        method: "POST",
        url: "/api/v1/planning/sessions",
        headers: { cookie: firstCookie, "x-bac-planning": "1" },
        payload: {
          ...createPayload,
          id: randomUUID(),
          subjectId: hiddenTopic!.subjectId,
          catalogueItemId: hiddenTopic!.id,
        },
      });
      expect(hiddenResponse.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  }, 30_000);
});
