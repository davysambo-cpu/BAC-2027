import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  drizzle as createPostgresDatabase,
  type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { environment, type Environment } from "../config/env";
import * as schema from "./schema";

export type AppDatabase = PostgresJsDatabase<typeof schema>;

export interface DatabaseConnection {
  database: AppDatabase;
  close: () => Promise<void>;
  driver: "postgres" | "pglite";
}

function findMigrationsFolder(): string {
  const candidates = [
    resolve(process.cwd(), "drizzle"),
    resolve(process.cwd(), "apps/api/drizzle"),
    fileURLToPath(new URL("../../drizzle", import.meta.url)),
    fileURLToPath(new URL("../drizzle", import.meta.url)),
  ];
  const folder = candidates.find((candidate) => existsSync(candidate));
  if (!folder) throw new Error("Unable to locate the Drizzle migrations folder.");
  return folder;
}

export async function createDatabaseConnection(
  configuration: Environment = environment,
): Promise<DatabaseConnection> {
  if (configuration.DATABASE_DRIVER === "pglite") {
    if (!configuration.PGLITE_DATA_DIR.includes("://")) {
      await mkdir(configuration.PGLITE_DATA_DIR, { recursive: true });
    }
    const [{ PGlite }, { drizzle: createPgliteDatabase }, { migrate }] = await Promise.all([
      import("@electric-sql/pglite"),
      import("drizzle-orm/pglite"),
      import("drizzle-orm/pglite/migrator"),
    ]);
    const client = new PGlite(configuration.PGLITE_DATA_DIR);
    const pgliteDatabase = createPgliteDatabase(client, { schema });
    await migrate(pgliteDatabase, { migrationsFolder: findMigrationsFolder() });

    return {
      database: pgliteDatabase as unknown as AppDatabase,
      close: () => client.close(),
      driver: "pglite",
    };
  }

  const client = postgres(configuration.DATABASE_URL, {
    max: configuration.DATABASE_MAX_CONNECTIONS,
    prepare: false,
  });

  return {
    database: createPostgresDatabase(client, { schema }),
    close: () => client.end(),
    driver: "postgres",
  };
}
