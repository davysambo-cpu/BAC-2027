import { randomUUID } from "node:crypto";

import { argon2id, hash } from "argon2";
import { afterEach, describe, expect, it } from "vitest";

import {
  courseDraftSchema,
  dailyReportSchema,
  knowledgeCardListResponseSchema,
  knowledgeCardSchema,
} from "@bac-2027/contracts";

import { buildApp } from "../../app";
import { readEnvironment } from "../../config/env";
import { createDatabaseConnection, type DatabaseConnection } from "../../db/client";
import { adminAuditLogs, studentProfiles, users } from "../../db/schema";
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
import { CuratedCorpusEnrichmentProvider } from "./curated-enrichment.provider";
import { DrizzleKnowledgeRepository } from "./knowledge.repository";
import { KnowledgeService } from "./knowledge.service";

const connections: DatabaseConnection[] = [];

afterEach(async () => {
  await Promise.all(connections.splice(0).map((connection) => connection.close()));
});

describe("curated knowledge corpus", () => {
  it("lets an admin publish a sourced card used to explain and check a student report", async () => {
    const environment = readEnvironment({
      NODE_ENV: "test",
      DATABASE_DRIVER: "pglite",
      PGLITE_DATA_DIR: "memory://",
      AUTH_TOKEN_SECRET: "test-only-auth-token-secret-with-32-characters",
    });
    const connection = await createDatabaseConnection(environment);
    connections.push(connection);
    await importInitialCatalogue(connection.database);

    const password = "Compte-BAC-2027";
    const passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    const adminId = randomUUID();
    const studentId = randomUUID();
    await connection.database.insert(users).values([
      {
        id: adminId,
        username: "savoir-admin",
        displayName: "Administration savoir",
        passwordHash,
        passwordChangedAt: new Date(),
        role: "admin",
        status: "active",
      },
      {
        id: studentId,
        username: "savoir-eleve",
        displayName: "Élève savoir",
        passwordHash,
        passwordChangedAt: new Date(),
        role: "student",
        status: "active",
      },
    ]);
    await connection.database
      .insert(studentProfiles)
      .values({ userId: studentId, seriesCode: "D" });

    const now = () => new Date("2026-10-17T14:00:00.000Z");
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
    const knowledgeRepository = new DrizzleKnowledgeRepository(connection.database);
    const knowledgeService = new KnowledgeService(knowledgeRepository, now);
    const enrichmentService = new EnrichmentService(
      new DrizzleEnrichmentRepository(connection.database),
      new CuratedCorpusEnrichmentProvider(
        knowledgeRepository,
        new LocalOutlineEnrichmentProvider(now),
        now,
      ),
      now,
    );
    const app = buildApp(
      { logger: false },
      {
        authService,
        catalogueService,
        dailyReportService,
        knowledgeService,
        enrichmentService,
        environment,
      },
    );

    async function login(username: string): Promise<string> {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { username, password, deviceType: "personal" },
      });
      const cookieHeader = response.headers["set-cookie"];
      const cookie = (Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader)?.split(
        ";",
        1,
      )[0];
      if (!cookie) throw new Error("The test session cookie was not created.");
      return cookie;
    }

    try {
      const adminCookie = await login("savoir-admin");
      const studentCookie = await login("savoir-eleve");
      const catalogue = await catalogueService.getStudentCatalogue("D");
      const mathematics = catalogue.subjects.find((subject) => subject.code === "MATHEMATIQUES")!;
      const topic = mathematics.items.find((item) =>
        item.title.startsWith("Fonction logarithme népérien"),
      )!;
      const reportId = randomUUID();
      const originalSummary = "Le professeur a indiqué que ln(0) = 0 pendant l'exercice.";
      const reportResponse = await app.inject({
        method: "POST",
        url: "/api/v1/daily-reports",
        headers: { cookie: studentCookie },
        payload: {
          id: reportId,
          subjectId: mathematics.id,
          catalogueItemId: topic.id,
          chapterId: null,
          lessonDate: "2026-10-17",
          title: "Propriétés de ln",
          originalSummary,
          understoodPoints: null,
          questions: "Cette égalité est-elle correcte ?",
          status: "saved",
        },
      });
      expect(dailyReportSchema.parse(reportResponse.json()).originalSummary).toBe(originalSummary);

      const localDraftResponse = await app.inject({
        method: "POST",
        url: `/api/v1/daily-reports/${reportId}/enrichment`,
        headers: { cookie: studentCookie, "x-bac-enrichment": "1" },
      });
      expect(courseDraftSchema.parse(localDraftResponse.json())).toMatchObject({
        provider: "local-outline",
        generationNumber: 1,
      });

      const cardInput = {
        catalogueItemId: topic.id,
        title: "Propriétés essentielles du logarithme népérien",
        status: "draft" as const,
        trustTier: "curated" as const,
        sourceTitle: "Référence pédagogique validée pour le test",
        sourcePublisher: "Équipe pédagogique BAC-2027",
        sourceUrl: "https://example.test/mathematiques/logarithme",
        sourceExcerpt:
          "Pour tout réel strictement positif x, ln(x) est défini. En particulier, ln(1) = 0 et ln(0) n'est pas défini.",
        content: {
          objectives: ["Utiliser les propriétés du logarithme népérien."],
          synthesis:
            "Le logarithme népérien est défini sur les réels strictement positifs et transforme un produit en somme.",
          definitions: [
            {
              term: "Logarithme népérien",
              explanation: "Fonction notée ln, définie sur les réels strictement positifs.",
            },
          ],
          explanations: [
            "La relation ln(ab) = ln(a) + ln(b) s'applique lorsque a et b sont strictement positifs.",
          ],
          examples: ["ln(1) = 0."],
        },
        correctionRules: [
          {
            trigger: "ln(0) = 0",
            proposedText: "ln(1) = 0 et ln(0) n'est pas défini.",
            explanation: "Le logarithme népérien est défini uniquement pour un argument positif.",
          },
        ],
      };

      const missingHeader = await app.inject({
        method: "POST",
        url: "/api/v1/admin/knowledge-cards",
        headers: { cookie: adminCookie },
        payload: cardInput,
      });
      expect(missingHeader.statusCode).toBe(400);
      expect(missingHeader.json()).toMatchObject({
        error: { code: "KNOWLEDGE_WRITE_HEADER_REQUIRED" },
      });

      const createResponse = await app.inject({
        method: "POST",
        url: "/api/v1/admin/knowledge-cards",
        headers: { cookie: adminCookie, "x-bac-knowledge-write": "1" },
        payload: cardInput,
      });
      expect(createResponse.statusCode).toBe(201);
      const card = knowledgeCardSchema.parse(createResponse.json());
      expect(card).toMatchObject({
        catalogueItemId: topic.id,
        subjectId: mathematics.id,
        status: "draft",
        version: 1,
      });

      const unpublishedGenerationResponse = await app.inject({
        method: "POST",
        url: `/api/v1/daily-reports/${reportId}/enrichment`,
        headers: { cookie: studentCookie, "x-bac-enrichment": "1" },
        payload: { force: true },
      });
      expect(courseDraftSchema.parse(unpublishedGenerationResponse.json())).toMatchObject({
        provider: "local-outline",
        generationNumber: 1,
      });

      const listResponse = await app.inject({
        method: "GET",
        url: "/api/v1/admin/knowledge-cards",
        headers: { cookie: adminCookie },
      });
      expect(knowledgeCardListResponseSchema.parse(listResponse.json()).cards).toHaveLength(1);

      const forbiddenList = await app.inject({
        method: "GET",
        url: "/api/v1/admin/knowledge-cards",
        headers: { cookie: studentCookie },
      });
      expect(forbiddenList.statusCode).toBe(403);

      const updateResponse = await app.inject({
        method: "PUT",
        url: `/api/v1/admin/knowledge-cards/${card.id}`,
        headers: { cookie: adminCookie, "x-bac-knowledge-write": "1" },
        payload: {
          ...cardInput,
          title: "Logarithme népérien — fiche approuvée",
          status: "published",
          version: 1,
        },
      });
      expect(knowledgeCardSchema.parse(updateResponse.json())).toMatchObject({
        status: "published",
        version: 2,
      });

      const staleUpdate = await app.inject({
        method: "PUT",
        url: `/api/v1/admin/knowledge-cards/${card.id}`,
        headers: { cookie: adminCookie, "x-bac-knowledge-write": "1" },
        payload: { ...cardInput, version: 1 },
      });
      expect(staleUpdate.statusCode).toBe(409);
      expect(staleUpdate.json()).toMatchObject({
        error: { code: "RESOURCE_VERSION_CONFLICT" },
      });

      const draftResponse = await app.inject({
        method: "POST",
        url: `/api/v1/daily-reports/${reportId}/enrichment`,
        headers: { cookie: studentCookie, "x-bac-enrichment": "1" },
        payload: { force: true },
      });
      const draft = courseDraftSchema.parse(draftResponse.json());
      expect(draft).toMatchObject({
        provider: "curated-corpus",
        generationNumber: 2,
        status: "needs_review",
        content: { synthesis: cardInput.content.synthesis },
      });
      expect(draft.corrections).toMatchObject([
        {
          originalExcerpt: "ln(0) = 0",
          proposedText: "ln(1) = 0 et ln(0) n'est pas défini.",
          reviewStatus: "proposed",
        },
      ]);
      expect(draft.corrections[0]?.citations[0]).toMatchObject({
        title: cardInput.sourceTitle,
        trustTier: "curated",
      });

      const repeatedGenerationResponse = await app.inject({
        method: "POST",
        url: `/api/v1/daily-reports/${reportId}/enrichment`,
        headers: { cookie: studentCookie, "x-bac-enrichment": "1" },
        payload: { force: true },
      });
      expect(repeatedGenerationResponse.statusCode).toBe(201);
      expect(courseDraftSchema.parse(repeatedGenerationResponse.json())).toMatchObject({
        id: draft.id,
        generationNumber: 2,
      });

      const reviewedResponse = await app.inject({
        method: "PATCH",
        url: `/api/v1/daily-reports/${reportId}/draft/corrections/${draft.corrections[0]!.id}`,
        headers: { cookie: studentCookie, "x-bac-enrichment": "1" },
        payload: { reviewStatus: "accepted" },
      });
      expect(reviewedResponse.statusCode).toBe(200);
      expect(courseDraftSchema.parse(reviewedResponse.json()).corrections[0]?.reviewStatus).toBe(
        "accepted",
      );

      const acceptedResponse = await app.inject({
        method: "POST",
        url: `/api/v1/daily-reports/${reportId}/draft/accept`,
        headers: { cookie: studentCookie, "x-bac-enrichment": "1" },
      });
      expect(acceptedResponse.statusCode).toBe(200);
      expect(courseDraftSchema.parse(acceptedResponse.json())).toMatchObject({
        id: draft.id,
        status: "accepted",
      });

      const reportsResponse = await app.inject({
        method: "GET",
        url: "/api/v1/daily-reports",
        headers: { cookie: studentCookie },
      });
      expect(reportsResponse.statusCode).toBe(200);
      expect(
        (
          reportsResponse.json() as { reports: Array<{ id: string; originalSummary: string }> }
        ).reports.find((report) => report.id === reportId)?.originalSummary,
      ).toBe(originalSummary);

      const auditActions = await connection.database
        .select({ action: adminAuditLogs.action })
        .from(adminAuditLogs);
      expect(auditActions.map((entry) => entry.action)).toEqual(
        expect.arrayContaining(["knowledge_card.created", "knowledge_card.published"]),
      );
    } finally {
      await app.close();
    }
  }, 30_000);
});
