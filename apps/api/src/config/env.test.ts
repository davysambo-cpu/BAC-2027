import { describe, expect, it } from "vitest";

import { readEnvironment } from "./env";

describe("environment", () => {
  it("uses safe development defaults", () => {
    const parsed = readEnvironment({});

    expect(parsed.HOST).toBe("0.0.0.0");
    expect(parsed.API_PORT).toBe(3000);
    expect(parsed.DEFAULT_USER_STORAGE_QUOTA_MB).toBe(250);
    expect(parsed.EMBEDDED_PREVIEW_MODE).toBe(false);
    expect(parsed.REVISION_TARGET_MONTH).toBe("2027-07");
    expect(parsed.SEED_DEMO_DATA).toBe(false);
  });

  it("rejects invalid runtime values", () => {
    expect(() => readEnvironment({ API_PORT: "70000" })).toThrow();
    expect(() => readEnvironment({ REVISION_TARGET_MONTH: "juillet-2027" })).toThrow();
  });

  it("requires PostgreSQL and a unique authentication secret in production", () => {
    expect(() => readEnvironment({ NODE_ENV: "production" })).toThrow();
    expect(
      readEnvironment({
        NODE_ENV: "production",
        DATABASE_DRIVER: "postgres",
        DATABASE_URL: "postgresql://bac2027:secret@database.example:5432/bac2027",
        AUTH_TOKEN_SECRET: "production-only-random-secret-with-at-least-32-characters",
        MEDIA_STORAGE_DRIVER: "s3",
        OBJECT_STORAGE_ENDPOINT: "https://objects.example.com",
        OBJECT_STORAGE_ACCESS_KEY: "production-access-key",
        OBJECT_STORAGE_SECRET_KEY: "production-secret-key",
      }).DATABASE_DRIVER,
    ).toBe("postgres");
  });
});
