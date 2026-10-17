import { afterEach, describe, expect, it } from "vitest";

import { OfflineDatabase } from "./database";
import { createOutboxOperation, enqueueOperation, retryDelayMilliseconds } from "./outbox";

const databases: OfflineDatabase[] = [];

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

describe("offline outbox", () => {
  it("creates a pending idempotent operation", () => {
    const operation = createOutboxOperation(
      {
        entityType: "resource",
        entityId: "5c295496-1956-46a2-9c70-926b48c1411e",
        kind: "update",
        baseVersion: 3,
        payload: { title: "Limites" },
      },
      new Date("2026-10-15T12:00:00.000Z"),
    );

    expect(operation.operationId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(operation.status).toBe("pending");
    expect(operation.attemptCount).toBe(0);
  });

  it("persists an operation in IndexedDB", async () => {
    const database = new OfflineDatabase(`bac-2027-test-${crypto.randomUUID()}`);
    databases.push(database);

    const operation = await enqueueOperation(database, {
      entityType: "revisionSession",
      entityId: "69581d60-df27-4948-a8db-f75c752bcab9",
      kind: "create",
      baseVersion: null,
      payload: { title: "Réviser les suites" },
    });

    expect(await database.outbox.get(operation.operationId)).toEqual(operation);
    expect(await database.outbox.count()).toBe(1);
  });

  it("caps retry backoff at five minutes", () => {
    expect(retryDelayMilliseconds(0)).toBe(1_000);
    expect(retryDelayMilliseconds(20)).toBe(256_000);
  });
});
