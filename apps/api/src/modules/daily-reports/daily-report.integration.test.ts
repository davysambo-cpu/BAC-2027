import { randomUUID } from "node:crypto";

import { argon2id, hash } from "argon2";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  courseDraftSchema,
  dailyReportAttachmentListResponseSchema,
  dailyReportAttachmentSchema,
  dailyReportListResponseSchema,
  dailyReportSchema,
} from "@bac-2027/contracts";

import { buildApp } from "../../app";
import { readEnvironment } from "../../config/env";
import { createDatabaseConnection, type DatabaseConnection } from "../../db/client";
import { catalogueItems, studentProfiles, users } from "../../db/schema";
import { DrizzleAuthRepository } from "../auth/auth.repository";
import { AuthService } from "../auth/auth.service";
import { importInitialCatalogue } from "../catalogue/catalogue.import";
import { DrizzleCatalogueRepository } from "../catalogue/catalogue.repository";
import { CatalogueService } from "../catalogue/catalogue.service";
import { InMemoryMediaStorage } from "../media/media.storage";
import { DrizzleDailyReportAttachmentRepository } from "./daily-report-attachment.repository";
import { DailyReportAttachmentService } from "./daily-report-attachment.service";
import { DrizzleDailyReportRepository } from "./daily-report.repository";
import { DailyReportService } from "./daily-report.service";
import type { EnrichmentProvider } from "./enrichment.provider";
import { DrizzleEnrichmentRepository } from "./enrichment.repository";
import { EnrichmentService } from "./enrichment.service";

const connections: DatabaseConnection[] = [];

afterEach(async () => {
  await Promise.all(connections.splice(0).map((connection) => connection.close()));
});

function multipartMedia(
  fields: Record<string, string>,
  file: { name: string; mimeType: string; content: Buffer },
) {
  const boundary = "----bac2027-test-boundary";
  const chunks: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
      ),
    );
  }
  chunks.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${file.name}"\r\nContent-Type: ${file.mimeType}\r\n\r\n`,
    ),
    file.content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  );
  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

describe("student daily reports", () => {
  it("keeps the original summary private and rejects a topic assigned to another series", async () => {
    const environment = readEnvironment({
      NODE_ENV: "test",
      DATABASE_DRIVER: "pglite",
      PGLITE_DATA_DIR: "memory://",
      AUTH_TOKEN_SECRET: "test-only-auth-token-secret-with-32-characters",
    });
    const connection = await createDatabaseConnection(environment);
    connections.push(connection);
    await importInitialCatalogue(connection.database);

    const studentId = randomUUID();
    const password = "Eleve-BAC-2027";
    await connection.database.insert(users).values({
      id: studentId,
      username: "bilan-test",
      displayName: "Élève Bilan",
      passwordHash: await hash(password, {
        type: argon2id,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
      }),
      passwordChangedAt: new Date(),
      role: "student",
      status: "active",
    });
    await connection.database
      .insert(studentProfiles)
      .values({ userId: studentId, seriesCode: "D" });

    const authService = new AuthService(
      new DrizzleAuthRepository(connection.database),
      environment,
    );
    const catalogueService = new CatalogueService(
      new DrizzleCatalogueRepository(connection.database),
    );
    const dailyReportService = new DailyReportService(
      new DrizzleDailyReportRepository(connection.database),
      () => new Date("2026-10-17T12:00:00.000Z"),
    );
    const mediaStorage = new InMemoryMediaStorage();
    const dailyReportAttachmentService = new DailyReportAttachmentService(
      new DrizzleDailyReportAttachmentRepository(connection.database),
      mediaStorage,
      environment,
    );
    const enrichmentProvider: EnrichmentProvider = {
      async generate(input) {
        return {
          provider: "test-provider",
          model: "deterministic-test",
          promptVersion: "test-v1",
          content: {
            objectives: ["Comprendre la propriété étudiée."],
            synthesis: input.report.originalSummary,
            definitions: [
              { term: "ln", explanation: "Notation du logarithme népérien à vérifier." },
            ],
            explanations: ["Une explication de test explicitement séparée du texte original."],
            examples: ["Exemple de test."],
            unresolvedPoints: ["Vérifier cette propriété avec la source citée."],
          },
          corrections: [
            {
              originalExcerpt: "le logarithme transforme les produits en sommes",
              proposedText:
                "Le logarithme népérien d'un produit est la somme des logarithmes des facteurs, lorsque les arguments sont strictement positifs.",
              explanation: "La condition de positivité doit être indiquée.",
              citationPositions: [0],
            },
          ],
          citations: [
            {
              trustTier: "curated",
              title: "Source pédagogique de test",
              publisher: "BAC-2027",
              url: "https://example.test/logarithme",
              excerpt: "Pour a et b strictement positifs, ln(ab) = ln(a) + ln(b).",
              retrievedAt: new Date("2026-10-17T12:00:00.000Z"),
            },
          ],
        };
      },
    };
    const enrichmentService = new EnrichmentService(
      new DrizzleEnrichmentRepository(connection.database),
      enrichmentProvider,
      () => new Date("2026-10-17T12:00:00.000Z"),
    );
    const app = buildApp(
      { logger: false },
      {
        authService,
        catalogueService,
        dailyReportService,
        dailyReportAttachmentService,
        enrichmentService,
        environment,
      },
    );

    try {
      const loginResponse = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { username: "bilan-test", password, deviceType: "personal" },
      });
      const cookieHeader = loginResponse.headers["set-cookie"];
      const cookie = (Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader)?.split(
        ";",
        1,
      )[0];
      expect(cookie).toBeTruthy();

      const catalogue = await catalogueService.getStudentCatalogue("D");
      const mathematics = catalogue.subjects.find((subject) => subject.code === "MATHEMATIQUES");
      const visibleTopic = mathematics?.items.find((item) =>
        item.title.startsWith("Fonction logarithme népérien"),
      );
      expect(mathematics).toBeTruthy();
      expect(visibleTopic).toBeTruthy();

      const reportId = randomUUID();
      const originalSummary =
        "Aujourd'hui nous avons dit que le logarithme transforme les produits en sommes.";
      const payload = {
        id: reportId,
        subjectId: mathematics!.id,
        catalogueItemId: visibleTopic!.id,
        chapterId: null,
        lessonDate: "2026-10-17",
        title: "Introduction au logarithme",
        originalSummary,
        understoodPoints: "La notation ln.",
        questions: "Pourquoi ln(1) vaut-il zéro ?",
        status: "saved",
      };
      const createdResponse = await app.inject({
        method: "POST",
        url: "/api/v1/daily-reports",
        headers: { cookie },
        payload,
      });
      expect(createdResponse.statusCode).toBe(201);
      const created = dailyReportSchema.parse(createdResponse.json());
      expect(created).toMatchObject({
        id: reportId,
        studentId,
        originalSummary,
        enrichmentStatus: "not_requested",
        version: 1,
      });

      const retriedResponse = await app.inject({
        method: "POST",
        url: "/api/v1/daily-reports",
        headers: { cookie },
        payload: {
          ...payload,
          originalSummary: "Une relance réseau ne doit pas remplacer le texte.",
        },
      });
      expect(retriedResponse.statusCode).toBe(201);
      expect(dailyReportSchema.parse(retriedResponse.json()).originalSummary).toBe(originalSummary);

      const listResponse = await app.inject({
        method: "GET",
        url: "/api/v1/daily-reports",
        headers: { cookie },
      });
      const list = dailyReportListResponseSchema.parse(listResponse.json());
      expect(list.reports).toHaveLength(1);
      expect(list.reports[0]?.originalSummary).toBe(originalSummary);

      const attachmentId = randomUUID();
      const jpegContent = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x42, 0x41, 0x43, 0x32, 0x30, 0x32, 0x37,
      ]);
      const uploadPayload = multipartMedia(
        { id: attachmentId, kind: "image" },
        { name: "page-cahier.jpg", mimeType: "image/jpeg", content: jpegContent },
      );
      const uploadResponse = await app.inject({
        method: "POST",
        url: `/api/v1/daily-reports/${reportId}/attachments`,
        headers: {
          cookie,
          "content-type": uploadPayload.contentType,
          "x-bac-media-upload": "1",
        },
        payload: uploadPayload.body,
      });
      expect(uploadResponse.statusCode).toBe(201);
      const attachment = dailyReportAttachmentSchema.parse(uploadResponse.json());
      expect(attachment).toMatchObject({
        id: attachmentId,
        reportId,
        kind: "image",
        originalName: "page-cahier.jpg",
        mimeType: "image/jpeg",
        sizeBytes: jpegContent.length,
        processingStatus: "stored",
      });

      const attachmentListResponse = await app.inject({
        method: "GET",
        url: `/api/v1/daily-reports/${reportId}/attachments`,
        headers: { cookie },
      });
      expect(
        dailyReportAttachmentListResponseSchema.parse(attachmentListResponse.json()).attachments,
      ).toHaveLength(1);

      const attachmentContentResponse = await app.inject({
        method: "GET",
        url: attachment.contentPath,
        headers: { cookie },
      });
      expect(attachmentContentResponse.statusCode).toBe(200);
      expect(attachmentContentResponse.headers["content-type"]).toBe("image/jpeg");
      expect(attachmentContentResponse.rawPayload).toEqual(jpegContent);

      const missingUploadHeader = await app.inject({
        method: "POST",
        url: `/api/v1/daily-reports/${reportId}/attachments`,
        headers: { cookie, "content-type": uploadPayload.contentType },
        payload: uploadPayload.body,
      });
      expect(missingUploadHeader.statusCode).toBe(403);

      const unsupportedPayload = multipartMedia(
        { id: randomUUID(), kind: "image" },
        {
          name: "faux-fichier.jpg",
          mimeType: "image/jpeg",
          content: Buffer.from("%PDF-1.7 contenu non autorisé"),
        },
      );
      const unsupportedResponse = await app.inject({
        method: "POST",
        url: `/api/v1/daily-reports/${reportId}/attachments`,
        headers: {
          cookie,
          "content-type": unsupportedPayload.contentType,
          "x-bac-media-upload": "1",
        },
        payload: unsupportedPayload.body,
      });
      expect(unsupportedResponse.statusCode).toBe(415);
      expect(unsupportedResponse.json()).toMatchObject({
        error: { code: "UNSUPPORTED_MEDIA_TYPE" },
      });

      const missingEnrichmentHeader = await app.inject({
        method: "POST",
        url: `/api/v1/daily-reports/${reportId}/enrichment`,
        headers: { cookie },
      });
      expect(missingEnrichmentHeader.statusCode).toBe(400);
      expect(missingEnrichmentHeader.json()).toMatchObject({
        error: { code: "ENRICHMENT_HEADER_REQUIRED" },
      });

      const enrichmentResponse = await app.inject({
        method: "POST",
        url: `/api/v1/daily-reports/${reportId}/enrichment`,
        headers: { cookie, "x-bac-enrichment": "1" },
      });
      expect(enrichmentResponse.statusCode).toBe(201);
      const draft = courseDraftSchema.parse(enrichmentResponse.json());
      expect(draft).toMatchObject({
        reportId,
        generationNumber: 1,
        baseReportVersion: 1,
        status: "needs_review",
        provider: "test-provider",
        content: { synthesis: originalSummary },
      });
      expect(draft.corrections).toHaveLength(1);
      expect(draft.corrections[0]?.reviewStatus).toBe("proposed");
      expect(draft.corrections[0]?.citations).toHaveLength(1);
      expect(draft.citations[0]?.trustTier).toBe("curated");

      const enrichmentRetry = await app.inject({
        method: "POST",
        url: `/api/v1/daily-reports/${reportId}/enrichment`,
        headers: { cookie, "x-bac-enrichment": "1" },
      });
      expect(courseDraftSchema.parse(enrichmentRetry.json()).id).toBe(draft.id);

      const prematureAcceptance = await app.inject({
        method: "POST",
        url: `/api/v1/daily-reports/${reportId}/draft/accept`,
        headers: { cookie, "x-bac-enrichment": "1" },
      });
      expect(prematureAcceptance.statusCode).toBe(409);
      expect(prematureAcceptance.json()).toMatchObject({
        error: { code: "CORRECTIONS_PENDING" },
      });

      const reviewedResponse = await app.inject({
        method: "PATCH",
        url: `/api/v1/daily-reports/${reportId}/draft/corrections/${draft.corrections[0]!.id}`,
        headers: { cookie, "x-bac-enrichment": "1" },
        payload: { reviewStatus: "accepted" },
      });
      expect(reviewedResponse.statusCode).toBe(200);
      expect(courseDraftSchema.parse(reviewedResponse.json()).corrections[0]?.reviewStatus).toBe(
        "accepted",
      );

      const acceptedResponse = await app.inject({
        method: "POST",
        url: `/api/v1/daily-reports/${reportId}/draft/accept`,
        headers: { cookie, "x-bac-enrichment": "1" },
      });
      expect(acceptedResponse.statusCode).toBe(200);
      expect(courseDraftSchema.parse(acceptedResponse.json())).toMatchObject({
        id: draft.id,
        status: "accepted",
        content: { synthesis: originalSummary },
      });

      const latestDraftResponse = await app.inject({
        method: "GET",
        url: `/api/v1/daily-reports/${reportId}/draft`,
        headers: { cookie },
      });
      expect(courseDraftSchema.parse(latestDraftResponse.json()).status).toBe("accepted");

      const reportsAfterAcceptance = dailyReportListResponseSchema.parse(
        (
          await app.inject({
            method: "GET",
            url: "/api/v1/daily-reports",
            headers: { cookie },
          })
        ).json(),
      );
      expect(reportsAfterAcceptance.reports[0]).toMatchObject({
        originalSummary,
        enrichmentStatus: "accepted",
      });

      const [hiddenTopic] = await connection.database
        .select({ id: catalogueItems.id })
        .from(catalogueItems)
        .where(
          eq(
            catalogueItems.title,
            "Les notions de base sur les similitudes directes (terminale C)",
          ),
        )
        .limit(1);
      expect(hiddenTopic).toBeTruthy();

      const rejectedResponse = await app.inject({
        method: "POST",
        url: "/api/v1/daily-reports",
        headers: { cookie },
        payload: { ...payload, id: randomUUID(), catalogueItemId: hiddenTopic!.id },
      });
      expect(rejectedResponse.statusCode).toBe(400);
      expect(rejectedResponse.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    } finally {
      await app.close();
    }
  }, 30_000);
});
