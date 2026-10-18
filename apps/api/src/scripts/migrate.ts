import { resolve } from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { environment } from "../config/env";

if (environment.DATABASE_DRIVER !== "postgres") {
  throw new Error("Database migrations require DATABASE_DRIVER=postgres.");
}

const client = postgres(environment.DATABASE_URL, {
  max: 1,
  prepare: false,
});

try {
  await migrate(drizzle(client), {
    migrationsFolder: resolve(process.cwd(), "drizzle"),
  });
  console.log("Migrations PostgreSQL appliquées.");
} finally {
  await client.end();
}
