import "dotenv/config";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://bac2027:bac2027_dev@localhost:5432/bac2027",
  },
  strict: true,
  verbose: true,
});
