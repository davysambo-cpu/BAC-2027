import { randomUUID } from "node:crypto";

import { argon2id, hash } from "argon2";
import { count, eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  catalogueBulkConfirmationResultSchema,
  catalogueValidationResultSchema,
  studentCatalogueResponseSchema,
} from "@bac-2027/contracts";

import { buildApp } from "../../app";
import { readEnvironment } from "../../config/env";
import { createDatabaseConnection, type DatabaseConnection } from "../../db/client";
import { adminAuditLogs, catalogueItems, studentProfiles, users } from "../../db/schema";
import { DrizzleAuthRepository } from "../auth/auth.repository";
import { AuthService } from "../auth/auth.service";
import { importInitialCatalogue } from "./catalogue.import";
import { DrizzleCatalogueRepository } from "./catalogue.repository";
import { CatalogueService } from "./catalogue.service";

const connections: DatabaseConnection[] = [];

afterEach(async () => {
  await Promise.all(connections.splice(0).map((connection) => connection.close()));
});

describe("initial student catalogue", () => {
  it("imports idempotently and hides entries explicitly assigned to other series", async () => {
    const environment = readEnvironment({
      NODE_ENV: "test",
      DATABASE_DRIVER: "pglite",
      PGLITE_DATA_DIR: "memory://",
      AUTH_TOKEN_SECRET: "test-only-auth-token-secret-with-32-characters",
    });
    const connection = await createDatabaseConnection(environment);
    connections.push(connection);

    const firstImport = await importInitialCatalogue(connection.database);
    const secondImport = await importInitialCatalogue(connection.database);
    expect(firstImport).toEqual({
      series: 1,
      subjects: 7,
      sources: 9,
      items: 203,
      studentVisibleItems: 191,
      hiddenOtherSeriesItems: 12,
    });
    expect(secondImport).toEqual(firstImport);

    const [storedCount] = await connection.database.select({ value: count() }).from(catalogueItems);
    expect(storedCount?.value).toBe(203);

    const studentId = randomUUID();
    const password = "Eleve-BAC-2027";
    await connection.database.insert(users).values({
      id: studentId,
      username: "catalogue-test",
      displayName: "Élève Catalogue",
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

    const adminPassword = "Admin-Catalogue-2027";
    await connection.database.insert(users).values({
      id: randomUUID(),
      username: "catalogue-admin",
      displayName: "Administration Catalogue",
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

    const authService = new AuthService(
      new DrizzleAuthRepository(connection.database),
      environment,
    );
    const catalogueService = new CatalogueService(
      new DrizzleCatalogueRepository(connection.database),
    );
    const app = buildApp({ logger: false }, { authService, catalogueService, environment });

    try {
      const anonymousResponse = await app.inject({ method: "GET", url: "/api/v1/catalogue" });
      expect(anonymousResponse.statusCode).toBe(401);

      const loginResponse = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { username: "catalogue-test", password, deviceType: "personal" },
      });
      const cookieHeader = loginResponse.headers["set-cookie"];
      const cookie = (Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader)?.split(
        ";",
        1,
      )[0];
      expect(cookie).toBeTruthy();

      const catalogueResponse = await app.inject({
        method: "GET",
        url: "/api/v1/catalogue",
        headers: { cookie },
      });
      expect(catalogueResponse.statusCode).toBe(200);
      const catalogue = studentCatalogueResponseSchema.parse(catalogueResponse.json());
      expect(catalogue.series).toEqual({ code: "D", name: "Série D" });
      expect(catalogue.subjects).toHaveLength(7);
      expect(catalogue.subjects.flatMap((subject) => subject.items)).toHaveLength(191);
      expect(catalogue.subjects.map((subject) => subject.name)).toEqual([
        "Français",
        "Anglais",
        "Mathématiques",
        "Philosophie",
        "Histoire-géographie",
        "Sciences physiques",
        "Sciences de la vie et de la Terre",
      ]);

      const visibleTitles = catalogue.subjects.flatMap((subject) =>
        subject.items.map((item) => item.title),
      );
      expect(visibleTitles).toContain("Les courbes paramétrées du plan (terminale D)");
      expect(visibleTitles).not.toContain(
        "Les notions de base sur les similitudes directes (terminale C)",
      );
      expect(visibleTitles).not.toContain("L'Union européenne (terminale A)");
      expect(visibleTitles).not.toContain("Les oscillations électriques libres (terminales C-E)");

      const forbiddenAdminCatalogueResponse = await app.inject({
        method: "GET",
        url: "/api/v1/admin/catalogue",
        headers: { cookie },
      });
      expect(forbiddenAdminCatalogueResponse.statusCode).toBe(403);

      const adminLoginResponse = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          username: "catalogue-admin",
          password: adminPassword,
          deviceType: "personal",
        },
      });
      const adminCookieHeader = adminLoginResponse.headers["set-cookie"];
      const adminCookie = (
        Array.isArray(adminCookieHeader) ? adminCookieHeader[0] : adminCookieHeader
      )?.split(";", 1)[0];
      expect(adminCookie).toBeTruthy();

      const adminCatalogueResponse = await app.inject({
        method: "GET",
        url: "/api/v1/admin/catalogue",
        headers: { cookie: adminCookie },
      });
      expect(adminCatalogueResponse.statusCode).toBe(200);
      const adminCatalogue = studentCatalogueResponseSchema.parse(adminCatalogueResponse.json());
      expect(adminCatalogue.subjects.flatMap((subject) => subject.items)).toHaveLength(203);
      const adminTitles = adminCatalogue.subjects.flatMap((subject) =>
        subject.items.map((item) => item.title),
      );
      expect(adminTitles).toContain(
        "Les notions de base sur les similitudes directes (terminale C)",
      );
      expect(adminTitles).toContain("L'Union européenne (terminale A)");
      expect(adminTitles).toContain("Les oscillations électriques libres (terminales C-E)");

      const confirmationPayload = {
        subjectId: null,
        validationLevel: "pedagogically_validated",
        justification: "Vérification pédagogique manuelle de toutes les matières de la Série D.",
        sourceUrl: null,
      } as const;
      const missingIntentResponse = await app.inject({
        method: "POST",
        url: "/api/v1/admin/catalogue/confirmations",
        headers: { cookie: adminCookie },
        payload: confirmationPayload,
      });
      expect(missingIntentResponse.statusCode).toBe(400);

      const forbiddenConfirmationResponse = await app.inject({
        method: "POST",
        url: "/api/v1/admin/catalogue/confirmations",
        headers: { cookie, "x-bac-catalogue-validation": "1" },
        payload: confirmationPayload,
      });
      expect(forbiddenConfirmationResponse.statusCode).toBe(403);

      const confirmationResponse = await app.inject({
        method: "POST",
        url: "/api/v1/admin/catalogue/confirmations",
        headers: { cookie: adminCookie, "x-bac-catalogue-validation": "1" },
        payload: confirmationPayload,
      });
      expect(confirmationResponse.statusCode).toBe(200);
      expect(
        catalogueBulkConfirmationResultSchema.parse(confirmationResponse.json()),
      ).toMatchObject({
        updatedItems: 191,
        updatedSubjects: 7,
      });

      const confirmedCatalogueResponse = await app.inject({
        method: "GET",
        url: "/api/v1/admin/catalogue",
        headers: { cookie: adminCookie },
      });
      const confirmedCatalogue = studentCatalogueResponseSchema.parse(
        confirmedCatalogueResponse.json(),
      );
      const confirmedItems = confirmedCatalogue.subjects
        .flatMap((subject) => subject.items)
        .filter((item) => item.adminSeriesDDecision === "explicitly_includes");
      expect(confirmedItems).toHaveLength(191);
      expect(
        confirmedItems.every(
          (item) =>
            item.validationStatus === "pedagogically_validated" &&
            item.validationVersion === 2 &&
            item.validationNote === confirmationPayload.justification,
        ),
      ).toBe(true);
      expect(
        confirmedCatalogue.subjects
          .flatMap((subject) => subject.items)
          .filter((item) => item.sourceSeriesDScope === "explicitly_excludes")
          .every((item) => item.adminSeriesDDecision === null),
      ).toBe(true);

      const itemToExclude = confirmedItems[0]!;
      const exclusionResponse = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/catalogue/items/${itemToExclude.id}/validation`,
        headers: { cookie: adminCookie, "x-bac-catalogue-validation": "1" },
        payload: {
          decision: "excluded",
          validationLevel: null,
          justification: "Le professeur confirme que ce thème ne relève pas de la Série D.",
          sourceUrl: null,
          version: itemToExclude.validationVersion,
        },
      });
      expect(exclusionResponse.statusCode).toBe(200);
      expect(catalogueValidationResultSchema.parse(exclusionResponse.json())).toMatchObject({
        itemId: itemToExclude.id,
        decision: "excluded",
        validationStatus: "excluded",
        version: 3,
      });

      const staleExclusionResponse = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/catalogue/items/${itemToExclude.id}/validation`,
        headers: { cookie: adminCookie, "x-bac-catalogue-validation": "1" },
        payload: {
          decision: "excluded",
          validationLevel: null,
          justification: "Cette seconde décision utilise volontairement une version périmée.",
          sourceUrl: null,
          version: itemToExclude.validationVersion,
        },
      });
      expect(staleExclusionResponse.statusCode).toBe(409);

      const studentCatalogueAfterExclusion = studentCatalogueResponseSchema.parse(
        (
          await app.inject({
            method: "GET",
            url: "/api/v1/catalogue",
            headers: { cookie },
          })
        ).json(),
      );
      expect(
        studentCatalogueAfterExclusion.subjects.flatMap((subject) => subject.items),
      ).toHaveLength(190);

      const [auditCount] = await connection.database
        .select({ value: count() })
        .from(adminAuditLogs);
      expect(auditCount?.value).toBe(2);

      const [hiddenCount] = await connection.database
        .select({ value: count() })
        .from(catalogueItems)
        .where(eq(catalogueItems.seriesDScope, "explicitly_excludes"));
      expect(hiddenCount?.value).toBe(12);
    } finally {
      await app.close();
    }
  }, 30_000);
});
