import { afterEach, describe, expect, it, vi } from "vitest";

import type { RevisionOverview } from "@bac-2027/contracts";

import { offlineDatabase } from "./database";
import {
  applyLocalReviewToOverview,
  localTopicRevisionReview,
  newTopicRevisionReview,
  pendingTopicRevisionReviews,
  stageTopicRevisionReview,
  syncPendingTopicRevisionReviews,
} from "./revision-reviews";

const studentId = "c1d21bb5-a1bd-42fc-9658-d3a493e6318c";
const catalogueItemId = "fedc451a-b68c-4dc7-9f7f-990cd0f9bc49";

afterEach(async () => {
  await offlineDatabase.outbox.clear();
});

describe("offline topic revision reviews", () => {
  it("queues an idempotent review and updates the cached overview immediately", async () => {
    const input = newTopicRevisionReview(
      "fragile",
      "Refaire l'exercice 4.",
      new Date("2026-10-17T12:00:00.000Z"),
    );
    await stageTopicRevisionReview(studentId, catalogueItemId, input);

    const pending = await pendingTopicRevisionReviews(studentId);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      catalogueItemId,
      input: {
        id: input.id,
        assessment: "fragile",
        performedAt: "2026-10-17T12:00:00.000Z",
      },
    });

    const overview: RevisionOverview = {
      generatedAt: "2026-10-17T11:00:00.000Z",
      targetMonth: "2027-07",
      summary: {
        totalTopics: 1,
        startedTopics: 0,
        coursesReady: 0,
        reviewedTopics: 0,
        masteredTopics: 0,
        dueTopics: 0,
      },
      topics: [
        {
          catalogueItemId,
          subjectId: "e3ea63b6-0c90-47dc-8bb2-dd7060d74d8e",
          subjectName: "Mathématiques",
          title: "Fonction logarithme népérien",
          section: "Mathématiques",
          reportCount: 0,
          acceptedCourseCount: 0,
          latestLessonDate: null,
          reviewCount: 0,
          latestReview: null,
          stage: "not_started",
          isDue: false,
        },
      ],
    };
    const review = localTopicRevisionReview(catalogueItemId, input);
    const updated = applyLocalReviewToOverview(overview, review);
    expect(review.nextReviewAt).toBe("2026-10-20T12:00:00.000Z");
    expect(updated.summary).toMatchObject({
      startedTopics: 1,
      reviewedTopics: 1,
    });
    expect(updated.topics[0]).toMatchObject({
      reviewCount: 1,
      stage: "reviewing",
      latestReview: { id: input.id },
    });
  });

  it("replays the same client identifier and removes the operation after acknowledgement", async () => {
    const input = newTopicRevisionReview("comfortable", null, new Date("2026-10-17T12:00:00Z"));
    await stageTopicRevisionReview(studentId, catalogueItemId, input);
    const send = vi.fn(async (itemId: string, sentInput: typeof input) =>
      localTopicRevisionReview(itemId, sentInput),
    );

    await expect(syncPendingTopicRevisionReviews(studentId, send)).resolves.toEqual({
      synced: 1,
      failed: 0,
    });
    expect(send).toHaveBeenCalledWith(catalogueItemId, input);
    expect(await pendingTopicRevisionReviews(studentId)).toHaveLength(0);
  });

  it("keeps a failed replay in the outbox for the next reconnection", async () => {
    const input = newTopicRevisionReview("difficult", null, new Date("2026-10-17T12:00:00Z"));
    const operationId = await stageTopicRevisionReview(studentId, catalogueItemId, input);

    await expect(
      syncPendingTopicRevisionReviews(studentId, async () => {
        throw new Error("Réseau indisponible");
      }),
    ).resolves.toEqual({ synced: 0, failed: 1 });

    expect(await pendingTopicRevisionReviews(studentId)).toHaveLength(1);
    expect(await offlineDatabase.outbox.get(operationId)).toMatchObject({
      status: "failed",
      attemptCount: 1,
      lastError: "Réseau indisponible",
    });
  });
});
