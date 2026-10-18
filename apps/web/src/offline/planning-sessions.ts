import {
  createRevisionSessionRequestSchema,
  updateRevisionSessionRequestSchema,
  type CreateRevisionSessionRequest,
  type DeleteRevisionSessionRequest,
  type RevisionSession,
  type UpdateRevisionSessionRequest,
} from "@bac-2027/contracts";

import { offlineDatabase, type LocalRevisionSession, type OutboxOperation } from "./database";
import { createOutboxOperation, retryDelayMilliseconds } from "./outbox";

const revisionSessionChangesSchema = updateRevisionSessionRequestSchema.omit({ version: true });

export type RevisionSessionChanges = Omit<UpdateRevisionSessionRequest, "version">;

export interface RevisionSessionLabels {
  subjectName: string | null;
  catalogueItemTitle: string | null;
}

export interface PlanningTransport {
  create(input: CreateRevisionSessionRequest): Promise<RevisionSession>;
  update(sessionId: string, input: UpdateRevisionSessionRequest): Promise<RevisionSession>;
  delete(sessionId: string, input: DeleteRevisionSessionRequest): Promise<void>;
}

function fromServer(studentId: string, session: RevisionSession): LocalRevisionSession {
  return {
    ...session,
    studentId,
    serverVersion: session.version,
    syncStatus: "synced",
    deletedAt: null,
  };
}

function operationsForStudent(studentId: string): Promise<OutboxOperation[]> {
  return offlineDatabase.outbox
    .where("entityType")
    .equals("revisionSession")
    .filter(
      (operation) =>
        (operation.status === "pending" || operation.status === "failed") &&
        operation.payload.studentId === studentId,
    )
    .toArray();
}

export async function listLocalRevisionSessions(
  studentId: string,
): Promise<LocalRevisionSession[]> {
  const sessions = await offlineDatabase.revisionSessions
    .where("studentId")
    .equals(studentId)
    .filter((session) => session.deletedAt === null)
    .toArray();
  return sessions.sort(
    (first, second) =>
      new Date(first.scheduledAt).getTime() - new Date(second.scheduledAt).getTime(),
  );
}

export async function storeServerRevisionSessions(
  studentId: string,
  sessions: RevisionSession[],
): Promise<void> {
  await offlineDatabase.transaction(
    "rw",
    [offlineDatabase.revisionSessions, offlineDatabase.outbox],
    async () => {
      const [current, operations] = await Promise.all([
        offlineDatabase.revisionSessions.where("studentId").equals(studentId).toArray(),
        operationsForStudent(studentId),
      ]);
      const pendingIds = new Set(operations.map((operation) => operation.entityId));
      const serverIds = new Set(sessions.map((session) => session.id));
      await offlineDatabase.revisionSessions.bulkDelete(
        current
          .filter((session) => !pendingIds.has(session.id) && !serverIds.has(session.id))
          .map((session) => session.id),
      );
      await offlineDatabase.revisionSessions.bulkPut(
        sessions
          .filter((session) => !pendingIds.has(session.id))
          .map((session) => fromServer(studentId, session)),
      );
    },
  );
}

export async function stageRevisionSessionCreate(
  studentId: string,
  input: CreateRevisionSessionRequest,
  labels: RevisionSessionLabels,
): Promise<LocalRevisionSession> {
  const now = new Date().toISOString();
  const local: LocalRevisionSession = {
    ...input,
    ...labels,
    studentId,
    status: "planned",
    completedAt: null,
    serverVersion: null,
    syncStatus: "pending",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const operation = createOutboxOperation({
    entityType: "revisionSession",
    entityId: input.id,
    kind: "create",
    baseVersion: null,
    payload: { studentId, input },
  });
  await offlineDatabase.transaction(
    "rw",
    [offlineDatabase.revisionSessions, offlineDatabase.outbox],
    async () => {
      await offlineDatabase.revisionSessions.put(local);
      await offlineDatabase.outbox.put(operation);
    },
  );
  return local;
}

export async function stageRevisionSessionUpdate(
  studentId: string,
  sessionId: string,
  changes: RevisionSessionChanges,
  labels: RevisionSessionLabels,
): Promise<LocalRevisionSession> {
  const current = await offlineDatabase.revisionSessions.get(sessionId);
  if (!current || current.studentId !== studentId || current.deletedAt !== null) {
    throw new Error("Cette séance n'est pas disponible sur cet appareil.");
  }
  const now = new Date().toISOString();
  const local: LocalRevisionSession = {
    ...current,
    ...changes,
    ...labels,
    completedAt: changes.status === "completed" ? (current.completedAt ?? now) : null,
    syncStatus: "pending",
    updatedAt: now,
  };
  const operation = createOutboxOperation({
    entityType: "revisionSession",
    entityId: sessionId,
    kind: "update",
    baseVersion: current.serverVersion,
    payload: { studentId, input: changes },
  });
  await offlineDatabase.transaction(
    "rw",
    [offlineDatabase.revisionSessions, offlineDatabase.outbox],
    async () => {
      const superseded = await offlineDatabase.outbox
        .where("entityType")
        .equals("revisionSession")
        .filter((candidate) => candidate.entityId === sessionId && candidate.kind === "update")
        .primaryKeys();
      await offlineDatabase.outbox.bulkDelete(superseded);
      await offlineDatabase.revisionSessions.put(local);
      await offlineDatabase.outbox.put(operation);
    },
  );
  return local;
}

export async function stageRevisionSessionDelete(
  studentId: string,
  sessionId: string,
): Promise<void> {
  const current = await offlineDatabase.revisionSessions.get(sessionId);
  if (!current || current.studentId !== studentId || current.deletedAt !== null) {
    throw new Error("Cette séance n'est pas disponible sur cet appareil.");
  }
  const now = new Date().toISOString();
  const operation = createOutboxOperation({
    entityType: "revisionSession",
    entityId: sessionId,
    kind: "delete",
    baseVersion: current.serverVersion,
    payload: { studentId },
  });
  await offlineDatabase.transaction(
    "rw",
    [offlineDatabase.revisionSessions, offlineDatabase.outbox],
    async () => {
      const superseded = await offlineDatabase.outbox
        .where("entityType")
        .equals("revisionSession")
        .filter((candidate) => candidate.entityId === sessionId && candidate.kind === "update")
        .primaryKeys();
      await offlineDatabase.outbox.bulkDelete(superseded);
      await offlineDatabase.revisionSessions.update(sessionId, {
        deletedAt: now,
        syncStatus: "pending",
        updatedAt: now,
      });
      await offlineDatabase.outbox.put(operation);
    },
  );
}

async function remainingOperations(studentId: string, entityId: string): Promise<number> {
  const operations = await operationsForStudent(studentId);
  return operations.filter((operation) => operation.entityId === entityId).length;
}

async function markOperationFailed(operation: OutboxOperation, error: unknown): Promise<void> {
  const attemptCount = operation.attemptCount + 1;
  await offlineDatabase.transaction(
    "rw",
    [offlineDatabase.revisionSessions, offlineDatabase.outbox],
    async () => {
      await offlineDatabase.outbox.update(operation.operationId, {
        status: "failed",
        attemptCount,
        lastError: error instanceof Error ? error.message : "Synchronisation impossible.",
        nextAttemptAt: new Date(Date.now() + retryDelayMilliseconds(attemptCount)).toISOString(),
      });
      await offlineDatabase.revisionSessions.update(operation.entityId, { syncStatus: "failed" });
    },
  );
}

const operationPriority: Record<OutboxOperation["kind"], number> = {
  create: 0,
  update: 1,
  delete: 2,
};

export async function syncPendingRevisionSessions(
  studentId: string,
  transport: PlanningTransport,
): Promise<{ synced: number; failed: number }> {
  const operations = (await operationsForStudent(studentId)).sort(
    (first, second) =>
      first.createdAt.localeCompare(second.createdAt) ||
      operationPriority[first.kind] - operationPriority[second.kind],
  );
  const blockedEntities = new Set<string>();
  let synced = 0;
  let failed = 0;

  for (const operation of operations) {
    if (blockedEntities.has(operation.entityId)) continue;
    try {
      if (operation.kind === "create") {
        const input = createRevisionSessionRequestSchema.parse(operation.payload.input);
        const serverSession = await transport.create(input);
        await offlineDatabase.outbox.delete(operation.operationId);
        const pendingCount = await remainingOperations(studentId, operation.entityId);
        if (pendingCount === 0) {
          await offlineDatabase.revisionSessions.put(fromServer(studentId, serverSession));
        } else {
          await offlineDatabase.revisionSessions.update(operation.entityId, {
            serverVersion: serverSession.version,
            createdAt: serverSession.createdAt,
            syncStatus: "pending",
          });
        }
      } else if (operation.kind === "update") {
        const local = await offlineDatabase.revisionSessions.get(operation.entityId);
        if (!local?.serverVersion) throw new Error("La création doit être synchronisée d'abord.");
        const changes = revisionSessionChangesSchema.parse(operation.payload.input);
        const serverSession = await transport.update(operation.entityId, {
          ...changes,
          version: local.serverVersion,
        });
        await offlineDatabase.outbox.delete(operation.operationId);
        const pendingCount = await remainingOperations(studentId, operation.entityId);
        if (pendingCount === 0) {
          await offlineDatabase.revisionSessions.put(fromServer(studentId, serverSession));
        } else {
          await offlineDatabase.revisionSessions.update(operation.entityId, {
            serverVersion: serverSession.version,
            syncStatus: "pending",
          });
        }
      } else {
        const local = await offlineDatabase.revisionSessions.get(operation.entityId);
        if (!local?.serverVersion) throw new Error("La création doit être synchronisée d'abord.");
        await transport.delete(operation.entityId, { version: local.serverVersion });
        await offlineDatabase.transaction(
          "rw",
          [offlineDatabase.revisionSessions, offlineDatabase.outbox],
          async () => {
            await offlineDatabase.outbox.delete(operation.operationId);
            await offlineDatabase.revisionSessions.delete(operation.entityId);
          },
        );
      }
      synced += 1;
    } catch (error) {
      await markOperationFailed(operation, error);
      blockedEntities.add(operation.entityId);
      failed += 1;
    }
  }

  return { synced, failed };
}
