import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  CreateRevisionSessionRequest,
  RevisionSession,
  UpdateRevisionSessionRequest,
} from "@bac-2027/contracts";

import { offlineDatabase } from "./database";
import {
  listLocalRevisionSessions,
  stageRevisionSessionCreate,
  stageRevisionSessionDelete,
  stageRevisionSessionUpdate,
  syncPendingRevisionSessions,
} from "./planning-sessions";

const studentId = "c1d21bb5-a1bd-42fc-9658-d3a493e6318c";
const sessionId = "8f86c2cf-b579-47c1-b8b2-f5c829023ac2";
const subjectId = "e3ea63b6-0c90-47dc-8bb2-dd7060d74d8e";
const catalogueItemId = "fedc451a-b68c-4dc7-9f7f-990cd0f9bc49";

const input: CreateRevisionSessionRequest = {
  id: sessionId,
  subjectId,
  catalogueItemId,
  title: "Revoir la fonction logarithme",
  notes: "Refaire un exercice sans regarder le cours.",
  scheduledAt: "2026-10-18T17:00:00.000Z",
  durationMinutes: 45,
};

function serverSession(
  source: CreateRevisionSessionRequest | UpdateRevisionSessionRequest,
  version: number,
): RevisionSession {
  return {
    id: sessionId,
    subjectId: source.subjectId,
    subjectName: "Mathématiques",
    catalogueItemId: source.catalogueItemId,
    catalogueItemTitle: "Fonction logarithme népérien",
    title: source.title,
    notes: source.notes,
    scheduledAt: source.scheduledAt,
    durationMinutes: source.durationMinutes,
    status: "status" in source ? source.status : "planned",
    completedAt:
      "status" in source && source.status === "completed" ? "2026-10-18T18:00:00.000Z" : null,
    version,
    createdAt: "2026-10-17T12:00:00.000Z",
    updatedAt: "2026-10-18T18:00:00.000Z",
  };
}

afterEach(async () => {
  await offlineDatabase.transaction(
    "rw",
    [offlineDatabase.revisionSessions, offlineDatabase.outbox],
    async () => {
      await offlineDatabase.revisionSessions.clear();
      await offlineDatabase.outbox.clear();
    },
  );
});

describe("offline revision planning", () => {
  it("keeps a created and completed session locally, then replays both operations in order", async () => {
    await stageRevisionSessionCreate(studentId, input, {
      subjectName: "Mathématiques",
      catalogueItemTitle: "Fonction logarithme népérien",
    });
    await stageRevisionSessionUpdate(
      studentId,
      sessionId,
      {
        subjectId,
        catalogueItemId,
        title: input.title,
        notes: input.notes,
        scheduledAt: input.scheduledAt,
        durationMinutes: 45,
        status: "completed",
      },
      {
        subjectName: "Mathématiques",
        catalogueItemTitle: "Fonction logarithme népérien",
      },
    );

    expect(await listLocalRevisionSessions(studentId)).toMatchObject([
      { id: sessionId, status: "completed", syncStatus: "pending", serverVersion: null },
    ]);

    const create = vi.fn(async (created: CreateRevisionSessionRequest) =>
      serverSession(created, 1),
    );
    const update = vi.fn(async (_id: string, updated: UpdateRevisionSessionRequest) =>
      serverSession(updated, 2),
    );
    const remove = vi.fn(async () => undefined);
    await expect(
      syncPendingRevisionSessions(studentId, { create, update, delete: remove }),
    ).resolves.toEqual({ synced: 2, failed: 0 });

    expect(create).toHaveBeenCalledWith(input);
    expect(update).toHaveBeenCalledWith(
      sessionId,
      expect.objectContaining({ version: 1, status: "completed" }),
    );
    expect(await listLocalRevisionSessions(studentId)).toMatchObject([
      { id: sessionId, status: "completed", syncStatus: "synced", serverVersion: 2 },
    ]);
    expect(await offlineDatabase.outbox.count()).toBe(0);
  });

  it("soft-deletes immediately and removes the local row after server acknowledgement", async () => {
    await offlineDatabase.revisionSessions.put({
      ...serverSession(input, 1),
      studentId,
      serverVersion: 1,
      syncStatus: "synced",
      deletedAt: null,
    });
    await stageRevisionSessionDelete(studentId, sessionId);
    expect(await listLocalRevisionSessions(studentId)).toEqual([]);

    const remove = vi.fn(async () => undefined);
    await expect(
      syncPendingRevisionSessions(studentId, {
        create: async (created) => serverSession(created, 1),
        update: async (_id, updated) => serverSession(updated, updated.version + 1),
        delete: remove,
      }),
    ).resolves.toEqual({ synced: 1, failed: 0 });
    expect(remove).toHaveBeenCalledWith(sessionId, { version: 1 });
    expect(await offlineDatabase.revisionSessions.get(sessionId)).toBeUndefined();
  });

  it("retains a failed operation for a later reconnection", async () => {
    await stageRevisionSessionCreate(studentId, input, {
      subjectName: "Mathématiques",
      catalogueItemTitle: "Fonction logarithme népérien",
    });
    await expect(
      syncPendingRevisionSessions(studentId, {
        create: async () => {
          throw new Error("Réseau indisponible");
        },
        update: async (_id, updated) => serverSession(updated, updated.version + 1),
        delete: async () => undefined,
      }),
    ).resolves.toEqual({ synced: 0, failed: 1 });
    expect(await listLocalRevisionSessions(studentId)).toMatchObject([
      { id: sessionId, syncStatus: "failed" },
    ]);
    expect(await offlineDatabase.outbox.toArray()).toMatchObject([
      { entityId: sessionId, status: "failed", attemptCount: 1 },
    ]);
  });
});
