import { describe, expect, it } from "vitest";

import {
  citedSourceUrlSchema,
  createTopicRevisionReviewRequestSchema,
  healthResponseSchema,
  syncMutationSchema,
} from "./index";

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

  it("accepts only a bounded revision self-assessment", () => {
    expect(
      createTopicRevisionReviewRequestSchema.safeParse({
        id: "78f4a873-a5f0-4fab-8c29-e182cb14f954",
        assessment: "fragile",
        note: "Refaire l'exercice du cahier.",
        performedAt: "2026-10-17T12:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      createTopicRevisionReviewRequestSchema.safeParse({
        assessment: "perfect",
        note: "x".repeat(1_001),
      }).success,
    ).toBe(false);
  });
});
