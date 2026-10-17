import {
  createTopicRevisionReviewRequestSchema,
  type CreateTopicRevisionReviewRequest,
  type RevisionAssessment,
  type RevisionOverview,
  type TopicRevisionReview,
} from "@bac-2027/contracts";

import { offlineDatabase } from "./database";
import { createOutboxOperation } from "./outbox";

const reviewIntervalsInDays: Record<RevisionAssessment, number> = {
  difficult: 1,
  fragile: 3,
  comfortable: 7,
  mastered: 21,
};

export interface PendingTopicRevisionReview {
  operationId: string;
  catalogueItemId: string;
  input: CreateTopicRevisionReviewRequest;
}

export function newTopicRevisionReview(
  assessment: RevisionAssessment,
  note: string | null,
  performedAt = new Date(),
): CreateTopicRevisionReviewRequest {
  return {
    id: crypto.randomUUID(),
    assessment,
    note,
    performedAt: performedAt.toISOString(),
  };
}

export function localTopicRevisionReview(
  catalogueItemId: string,
  input: CreateTopicRevisionReviewRequest,
): TopicRevisionReview {
  const performedAt = new Date(input.performedAt);
  return {
    id: input.id,
    catalogueItemId,
    assessment: input.assessment,
    note: input.note,
    reviewedAt: input.performedAt,
    nextReviewAt: new Date(
      performedAt.getTime() + reviewIntervalsInDays[input.assessment] * 24 * 60 * 60 * 1_000,
    ).toISOString(),
  };
}

export async function stageTopicRevisionReview(
  studentId: string,
  catalogueItemId: string,
  input: CreateTopicRevisionReviewRequest,
): Promise<string> {
  const operation = createOutboxOperation({
    entityType: "topicRevisionReview",
    entityId: input.id,
    kind: "create",
    baseVersion: null,
    payload: { ...input, studentId, catalogueItemId },
  });
  await offlineDatabase.outbox.put(operation);
  return operation.operationId;
}

export async function pendingTopicRevisionReviews(
  studentId: string,
): Promise<PendingTopicRevisionReview[]> {
  const operations = await offlineDatabase.outbox
    .where("entityType")
    .equals("topicRevisionReview")
    .filter(
      (operation) =>
        (operation.status === "pending" || operation.status === "failed") &&
        operation.payload.studentId === studentId,
    )
    .toArray();
  return operations.map((operation) => ({
    operationId: operation.operationId,
    catalogueItemId: String(operation.payload.catalogueItemId),
    input: createTopicRevisionReviewRequestSchema.parse(operation.payload),
  }));
}

export async function markTopicRevisionReviewSynced(operationId: string): Promise<void> {
  await offlineDatabase.outbox.delete(operationId);
}

export async function markTopicRevisionReviewSyncFailed(
  operationId: string,
  message: string,
): Promise<void> {
  const operation = await offlineDatabase.outbox.get(operationId);
  if (!operation) return;
  await offlineDatabase.outbox.update(operationId, {
    status: "failed",
    lastError: message,
    attemptCount: operation.attemptCount + 1,
  });
}

export async function syncPendingTopicRevisionReviews(
  studentId: string,
  send: (
    catalogueItemId: string,
    input: CreateTopicRevisionReviewRequest,
  ) => Promise<TopicRevisionReview>,
): Promise<{ synced: number; failed: number }> {
  const pending = await pendingTopicRevisionReviews(studentId);
  let synced = 0;
  let failed = 0;
  for (const review of pending) {
    try {
      await send(review.catalogueItemId, review.input);
      await markTopicRevisionReviewSynced(review.operationId);
      synced += 1;
    } catch (error) {
      await markTopicRevisionReviewSyncFailed(
        review.operationId,
        error instanceof Error ? error.message : "Synchronisation impossible.",
      );
      failed += 1;
    }
  }
  return { synced, failed };
}

export function applyLocalReviewToOverview(
  overview: RevisionOverview,
  review: TopicRevisionReview,
): RevisionOverview {
  const topics = overview.topics.map((topic) =>
    topic.catalogueItemId === review.catalogueItemId
      ? {
          ...topic,
          reviewCount: topic.reviewCount + (topic.latestReview?.id === review.id ? 0 : 1),
          latestReview: review,
          stage: review.assessment === "mastered" ? ("mastered" as const) : ("reviewing" as const),
          isDue: false,
        }
      : topic,
  );
  return {
    ...overview,
    generatedAt: review.reviewedAt,
    topics,
    summary: {
      totalTopics: topics.length,
      startedTopics: topics.filter((topic) => topic.reportCount > 0 || topic.reviewCount > 0)
        .length,
      coursesReady: topics.filter((topic) => topic.acceptedCourseCount > 0).length,
      reviewedTopics: topics.filter((topic) => topic.reviewCount > 0).length,
      masteredTopics: topics.filter((topic) => topic.stage === "mastered").length,
      dueTopics: topics.filter((topic) => topic.isDue).length,
    },
  };
}
