import { randomUUID } from "node:crypto";

import { argon2id, hash } from "argon2";
import { count, eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { studentCatalogueResponseSchema } from "@bac-2027/contracts";

import { buildApp } from "../../app";
import { readEnvironment } from "../../config/env";
import { createDatabaseConnection, type DatabaseConnection } from "../../db/client";
import { catalogueItems, studentProfiles, users } from "../../db/schema";
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
