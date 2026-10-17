import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  external: ["@electric-sql/pglite", "drizzle-orm/pglite", "drizzle-orm/pglite/migrator"],
  noExternal: ["@bac-2027/contracts"],
});
