import { randomUUID } from "node:crypto";

import { argon2id, hash } from "argon2";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { revisionOverviewSchema, topicRevisionReviewSchema } from "@bac-2027/contracts";

import { buildApp } from "../../app";
import { readEnvironment } from "../../config/env";
import { createDatabaseConnection, type DatabaseConnection } from "../../db/client";
import { catalogueItems, studentProfiles, users } from "../../db/schema";
import { DrizzleAuthRepository } from "../auth/auth.repository";
import { AuthService } from "../auth/auth.service";
import { importInitialCatalogue } from "../catalogue/catalogue.import";
import { DrizzleCatalogueRepository } from "../catalogue/catalogue.repository";
import { CatalogueService } from "../catalogue/catalogue.service";
import { DrizzleDailyReportRepository } from "../daily-reports/daily-report.repository";
import { DailyReportService } from "../daily-reports/daily-report.service";
import { LocalOutlineEnrichmentProvider } from "../daily-reports/enrichment.provider";
import { DrizzleEnrichmentRepository } from "../daily-reports/enrichment.repository";
import { EnrichmentService } from "../daily-reports/enrichment.service";
import { DrizzleRevisionRepository } from "./revision.repository";
import { RevisionService } from "./revision.service";

const connections: DatabaseConnection[] = [];

afterEach(async () => {
  await Promise.all(connections.splice(0).map((connection) => connection.close()));
});

describe("personal revision notebook", () => {
  it("turns the programme into a private long-term revision checklist", async () => {
    const environment = readEnvironment({
      NODE_ENV: "test",
      DATABASE_DRIVER: "pglite",
      PGLITE_DATA_DIR: "memory://",
      AUTH_TOKEN_SECRET: "test-only-auth-token-secret-with-32-characters",
      REVISION_TARGET_MONTH: "2027-07",
    });
    const connection = await createDatabaseConnection(environment);
    connections.push(connection);
    await importInitialCatalogue(connection.database);

    const password = "Revision-BAC-2027";
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
        username: "revision-eleve-a",
        displayName: "Élève Révision A",
        passwordHash,
        passwordChangedAt: new Date(),
        role: "student",
        status: "active",
      },
      {
        id: secondStudentId,
        username: "revision-eleve-b",
        displayName: "Élève Révision B",
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
    const now = () => new Date(currentDate);
    const authService = new AuthService(
      new DrizzleAuthRepository(connection.database),
      environment,
    );
    const catalogueService = new CatalogueService(
      new DrizzleCatalogueRepository(connection.database),
    );
    const dailyReportService = new DailyReportService(
      new DrizzleDailyReportRepository(connection.database),
      now,
    );
    const enrichmentService = new EnrichmentService(
      new DrizzleEnrichmentRepository(connection.database),
      new LocalOutlineEnrichmentProvider(now),
      now,
    );
    const revisionService = new RevisionService(
      new DrizzleRevisionRepository(connection.database),
      environment.REVISION_TARGET_MONTH,
      now,
    );
    const app = buildApp(
      { logger: false },
      {
        authService,
        catalogueService,
        dailyReportService,
        enrichmentService,
        revisionService,
        environment,
      },
    );

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
      const firstCookie = await login("revision-eleve-a");
      const secondCookie = await login("revision-eleve-b");
      const catalogue = await catalogueService.getStudentCatalogue("D");
      const mathematics = catalogue.subjects.find((subject) => subject.code === "MATHEMATIQUES")!;
      const topic = mathematics.items[0]!;

      const initialResponse = await app.inject({
        method: "GET",
        url: "/api/v1/revision/topics",
        headers: { cookie: firstCookie },
      });
      expect(initialResponse.statusCode).toBe(200);
      const initial = revisionOverviewSchema.parse(initialResponse.json());
      expect(initial).toMatchObject({
        targetMonth: "2027-07",
        summary: {
          totalTopics: 191,
          startedTopics: 0,
          coursesReady: 0,
          reviewedTopics: 0,
          masteredTopics: 0,
          dueTopics: 0,
        },
      });

      const reportId = randomUUID();
      const reportResponse = await app.inject({
        method: "POST",
        url: "/api/v1/daily-reports",
        headers: { cookie: firstCookie },
        payload: {
          id: reportId,
          subjectId: mathematics.id,
          catalogueItemId: topic.id,
          chapterId: null,
          lessonDate: "2026-10-17",
          title: topic.title,
          originalSummary: "Résumé personnel reçu et noté pendant le cours.",
          understoodPoints: "Le principe général est compris.",
          questions: "Je dois refaire un exercice.",
          status: "saved",
        },
      });
      expect(reportResponse.statusCode).toBe(201);

      const collectingResponse = await app.inject({
        method: "GET",
        url: "/api/v1/revision/topics",
        headers: { cookie: firstCookie },
      });
      const collecting = revisionOverviewSchema
        .parse(collectingResponse.json())
        .topics.find((candidate) => candidate.catalogueItemId === topic.id)!;
      expect(collecting).toMatchObject({
        reportCount: 1,
        acceptedCourseCount: 0,
        stage: "collecting",
        isDue: false,
      });

      const draftResponse = await app.inject({
        method: "POST",
        url: `/api/v1/daily-reports/${reportId}/enrichment`,
        headers: { cookie: firstCookie, "x-bac-enrichment": "1" },
      });
      expect(draftResponse.statusCode).toBe(201);
      const acceptedResponse = await app.inject({
        method: "POST",
        url: `/api/v1/daily-reports/${reportId}/draft/accept`,
        headers: { cookie: firstCookie, "x-bac-enrichment": "1" },
      });
      expect(acceptedResponse.statusCode).toBe(200);

      const readyResponse = await app.inject({
        method: "GET",
        url: "/api/v1/revision/topics",
        headers: { cookie: firstCookie },
      });
      const ready = revisionOverviewSchema
        .parse(readyResponse.json())
        .topics.find((candidate) => candidate.catalogueItemId === topic.id)!;
      expect(ready).toMatchObject({
        acceptedCourseCount: 1,
        stage: "ready",
        isDue: true,
      });

      const missingHeaderResponse = await app.inject({
        method: "POST",
        url: `/api/v1/revision/topics/${topic.id}/reviews`,
        headers: { cookie: firstCookie },
        payload: {
          id: randomUUID(),
          assessment: "fragile",
          note: null,
          performedAt: currentDate.toISOString(),
        },
      });
      expect(missingHeaderResponse.statusCode).toBe(400);
      expect(missingHeaderResponse.json()).toMatchObject({
        error: { code: "REVISION_WRITE_HEADER_REQUIRED" },
      });

      const futureReviewResponse = await app.inject({
        method: "POST",
        url: `/api/v1/revision/topics/${topic.id}/reviews`,
        headers: { cookie: firstCookie, "x-bac-revision": "1" },
        payload: {
          id: randomUUID(),
          assessment: "comfortable",
          note: null,
          performedAt: new Date(currentDate.getTime() + 6 * 60 * 1_000).toISOString(),
        },
      });
      expect(futureReviewResponse.statusCode).toBe(400);
      expect(futureReviewResponse.json()).toMatchObject({
        error: { code: "VALIDATION_ERROR" },
      });

      const firstReviewId = randomUUID();
      const firstReviewResponse = await app.inject({
        method: "POST",
        url: `/api/v1/revision/topics/${topic.id}/reviews`,
        headers: { cookie: firstCookie, "x-bac-revision": "1" },
        payload: {
          id: firstReviewId,
          assessment: "fragile",
          note: "Refaire l'exercice du cahier.",
          performedAt: currentDate.toISOString(),
        },
      });
      expect(firstReviewResponse.statusCode).toBe(201);
      expect(topicRevisionReviewSchema.parse(firstReviewResponse.json())).toMatchObject({
        id: firstReviewId,
        catalogueItemId: topic.id,
        assessment: "fragile",
        note: "Refaire l'exercice du cahier.",
        reviewedAt: "2026-10-17T14:00:00.000Z",
        nextReviewAt: "2026-10-20T14:00:00.000Z",
      });

      const retriedReviewResponse = await app.inject({
        method: "POST",
        url: `/api/v1/revision/topics/${topic.id}/reviews`,
        headers: { cookie: firstCookie, "x-bac-revision": "1" },
        payload: {
          id: firstReviewId,
          assessment: "fragile",
          note: "Refaire l'exercice du cahier.",
          performedAt: currentDate.toISOString(),
        },
      });
      expect(retriedReviewResponse.statusCode).toBe(201);
      expect(topicRevisionReviewSchema.parse(retriedReviewResponse.json()).id).toBe(firstReviewId);

      const privateOverviewResponse = await app.inject({
        method: "GET",
        url: "/api/v1/revision/topics",
        headers: { cookie: secondCookie },
      });
      const privateTopic = revisionOverviewSchema
        .parse(privateOverviewResponse.json())
        .topics.find((candidate) => candidate.catalogueItemId === topic.id)!;
      expect(privateTopic).toMatchObject({
        reportCount: 0,
        reviewCount: 0,
        latestReview: null,
        stage: "not_started",
      });

      currentDate = new Date("2026-10-21T14:00:00.000Z");
      const dueResponse = await app.inject({
        method: "GET",
        url: "/api/v1/revision/topics",
        headers: { cookie: firstCookie },
      });
      const dueTopic = revisionOverviewSchema
        .parse(dueResponse.json())
        .topics.find((candidate) => candidate.catalogueItemId === topic.id)!;
      expect(dueTopic).toMatchObject({
        reviewCount: 1,
        stage: "reviewing",
        isDue: true,
      });

      const masteredResponse = await app.inject({
        method: "POST",
        url: `/api/v1/revision/topics/${topic.id}/reviews`,
        headers: { cookie: firstCookie, "x-bac-revision": "1" },
        payload: {
          id: randomUUID(),
          assessment: "mastered",
          note: null,
          performedAt: currentDate.toISOString(),
        },
      });
      expect(masteredResponse.statusCode).toBe(201);
      expect(topicRevisionReviewSchema.parse(masteredResponse.json())).toMatchObject({
        assessment: "mastered",
        nextReviewAt: "2026-11-11T14:00:00.000Z",
      });

      const finalOverviewResponse = await app.inject({
        method: "GET",
        url: "/api/v1/revision/topics",
        headers: { cookie: firstCookie },
      });
      const finalOverview = revisionOverviewSchema.parse(finalOverviewResponse.json());
      expect(finalOverview.summary).toMatchObject({
        startedTopics: 1,
        coursesReady: 1,
        reviewedTopics: 1,
        masteredTopics: 1,
        dueTopics: 0,
      });
      expect(
        finalOverview.topics.find((candidate) => candidate.catalogueItemId === topic.id),
      ).toMatchObject({
        reviewCount: 2,
        stage: "mastered",
        isDue: false,
      });

      const [hiddenTopic] = await connection.database
        .select({ id: catalogueItems.id })
        .from(catalogueItems)
        .where(eq(catalogueItems.seriesDScope, "explicitly_excludes"))
        .limit(1);
      expect(hiddenTopic).toBeTruthy();
      const hiddenReviewResponse = await app.inject({
        method: "POST",
        url: `/api/v1/revision/topics/${hiddenTopic!.id}/reviews`,
        headers: { cookie: firstCookie, "x-bac-revision": "1" },
        payload: {
          id: randomUUID(),
          assessment: "comfortable",
          note: null,
          performedAt: currentDate.toISOString(),
        },
      });
      expect(hiddenReviewResponse.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  }, 30_000);
});
