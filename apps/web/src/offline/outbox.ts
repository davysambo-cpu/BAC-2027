import type { MutationKind, SyncEntityType } from "@bac-2027/contracts";

import type { OfflineDatabase, OutboxOperation } from "./database";

export interface NewOutboxOperation {
  entityType: SyncEntityType;
  entityId: string;
  kind: MutationKind;
  baseVersion: number | null;
  payload: Record<string, unknown>;
}

export function retryDelayMilliseconds(attemptCount: number): number {
  const safeAttempt = Math.max(0, Math.min(attemptCount, 8));
  return Math.min(1_000 * 2 ** safeAttempt, 5 * 60 * 1_000);
}

export function createOutboxOperation(
  input: NewOutboxOperation,
  now = new Date(),
): OutboxOperation {
  return {
    operationId: crypto.randomUUID(),
    ...input,
    createdAt: now.toISOString(),
    attemptCount: 0,
    nextAttemptAt: now.toISOString(),
    status: "pending",
    lastError: null,
  };
}

export async function enqueueOperation(
  database: OfflineDatabase,
  input: NewOutboxOperation,
): Promise<OutboxOperation> {
  const operation = createOutboxOperation(input);
  await database.outbox.add(operation);
  return operation;
}
