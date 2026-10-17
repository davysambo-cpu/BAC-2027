import { z } from "zod";

import { lessonDateSchema } from "./daily-reports";
import { isoDateTimeSchema, uuidSchema } from "./common";

export const revisionAssessmentSchema = z.enum(["difficult", "fragile", "comfortable", "mastered"]);

export const revisionTopicStageSchema = z.enum([
  "not_started",
  "collecting",
  "ready",
  "reviewing",
  "mastered",
]);

export const createTopicRevisionReviewRequestSchema = z.object({
  id: uuidSchema,
  assessment: revisionAssessmentSchema,
  note: z.string().trim().max(1_000).nullable().default(null),
  performedAt: isoDateTimeSchema,
});

export const topicRevisionReviewSchema = z.object({
  id: uuidSchema,
  catalogueItemId: uuidSchema,
  assessment: revisionAssessmentSchema,
  note: z.string().max(1_000).nullable(),
  reviewedAt: isoDateTimeSchema,
  nextReviewAt: isoDateTimeSchema,
});

export const revisionTopicSchema = z.object({
  catalogueItemId: uuidSchema,
  subjectId: uuidSchema,
  subjectName: z.string().min(1).max(160),
  title: z.string().min(1).max(400),
  section: z.string().min(1).max(200),
  reportCount: z.number().int().nonnegative(),
  acceptedCourseCount: z.number().int().nonnegative(),
  latestLessonDate: lessonDateSchema.nullable(),
  reviewCount: z.number().int().nonnegative(),
  latestReview: topicRevisionReviewSchema.nullable(),
  stage: revisionTopicStageSchema,
  isDue: z.boolean(),
});

export const revisionOverviewSchema = z.object({
  generatedAt: isoDateTimeSchema,
  targetMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  summary: z.object({
    totalTopics: z.number().int().nonnegative(),
    startedTopics: z.number().int().nonnegative(),
    coursesReady: z.number().int().nonnegative(),
    reviewedTopics: z.number().int().nonnegative(),
    masteredTopics: z.number().int().nonnegative(),
    dueTopics: z.number().int().nonnegative(),
  }),
  topics: z.array(revisionTopicSchema),
});

export type RevisionAssessment = z.infer<typeof revisionAssessmentSchema>;
export type RevisionTopicStage = z.infer<typeof revisionTopicStageSchema>;
export type CreateTopicRevisionReviewRequest = z.infer<
  typeof createTopicRevisionReviewRequestSchema
>;
export type TopicRevisionReview = z.infer<typeof topicRevisionReviewSchema>;
export type RevisionTopic = z.infer<typeof revisionTopicSchema>;
export type RevisionOverview = z.infer<typeof revisionOverviewSchema>;
