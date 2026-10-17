import { describe, expect, it } from "vitest";

import { citedSourceUrlSchema, healthResponseSchema, syncMutationSchema } from "./index";

describe("shared contracts", () => {
  it("accepts a valid API health response", () => {
    const result = healthResponseSchema.safeParse({
      service: "bac-2027-api",
      status: "ok",
      version: "0.1.0",
      timestamp: "2026-10-15T12:00:00.000Z",
      environment: "test",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a sync mutation without a valid operation id", () => {
    const result = syncMutationSchema.safeParse({
      operationId: "not-a-uuid",
      entityType: "resource",
      entityId: "5c295496-1956-46a2-9c70-926b48c1411e",
      kind: "update",
      baseVersion: 1,
      payload: { title: "Cours" },
      createdAt: "2026-10-15T12:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an executable citation URL", () => {
    expect(citedSourceUrlSchema.safeParse("https://example.test/source").success).toBe(true);
    expect(citedSourceUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });
});
