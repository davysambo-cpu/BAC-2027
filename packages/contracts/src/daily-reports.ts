import { z } from "zod";

import { isoDateTimeSchema, uuidSchema } from "./common";

export const lessonDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    if (year === undefined || month === undefined || day === undefined) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "La date du cours est invalide.");
export const dailyReportStatusSchema = z.enum(["draft", "saved", "archived"]);
export const enrichmentStatusSchema = z.enum([
  "not_requested",
  "queued",
  "processing",
  "needs_review",
  "accepted",
  "failed",
]);
export const dailyReportAttachmentKindSchema = z.enum(["image", "audio"]);
export const attachmentProcessingStatusSchema = z.enum([
  "stored",
  "queued",
  "processing",
  "ready",
  "failed",
]);
export const correctionReviewStatusSchema = z.enum([
  "proposed",
  "accepted",
  "rejected",
  "ask_teacher",
]);
export const sourceTrustTierSchema = z.enum(["institutional", "curated", "catalogue", "web"]);

export const createDailyReportRequestSchema = z.object({
  id: uuidSchema,
  subjectId: uuidSchema,
  catalogueItemId: uuidSchema.nullable().default(null),
  chapterId: uuidSchema.nullable().default(null),
  lessonDate: lessonDateSchema,
  title: z.string().trim().min(1).max(240),
  originalSummary: z.string().trim().min(1).max(20_000),
  understoodPoints: z.string().trim().max(10_000).nullable().default(null),
  questions: z.string().trim().max(10_000).nullable().default(null),
  status: z.enum(["draft", "saved"]).default("saved"),
});

export const dailyReportSchema = createDailyReportRequestSchema.extend({
  studentId: uuidSchema,
  status: dailyReportStatusSchema,
  enrichmentStatus: enrichmentStatusSchema,
  version: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const dailyReportListResponseSchema = z.object({
  reports: z.array(dailyReportSchema),
});

export const dailyReportAttachmentSchema = z.object({
  id: uuidSchema,
  reportId: uuidSchema,
  kind: dailyReportAttachmentKindSchema,
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(160),
  sizeBytes: z.number().int().positive(),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
  durationSeconds: z.number().int().nonnegative().nullable(),
  processingStatus: attachmentProcessingStatusSchema,
  contentPath: z.string().startsWith("/api/v1/daily-reports/"),
  createdAt: isoDateTimeSchema,
});

export const dailyReportAttachmentListResponseSchema = z.object({
  attachments: z.array(dailyReportAttachmentSchema),
});

export const citedSourceUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  }, "La source doit utiliser une URL HTTP ou HTTPS.");

export const generatedCourseContentSchema = z.object({
  objectives: z.array(z.string().min(1).max(500)).max(12),
  synthesis: z.string().min(1).max(30_000),
  definitions: z
    .array(
      z.object({
        term: z.string().min(1).max(200),
        explanation: z.string().min(1).max(2_000),
      }),
    )
    .max(30),
  explanations: z.array(z.string().min(1).max(4_000)).max(30),
  examples: z.array(z.string().min(1).max(4_000)).max(20),
  unresolvedPoints: z.array(z.string().min(1).max(2_000)).max(30),
});

export const draftCitationSchema = z.object({
  id: uuidSchema,
  correctionId: uuidSchema.nullable(),
  position: z.number().int().nonnegative(),
  trustTier: sourceTrustTierSchema,
  title: z.string().min(1).max(300),
  publisher: z.string().min(1).max(200).nullable(),
  url: citedSourceUrlSchema.nullable(),
  excerpt: z.string().max(4_000).nullable(),
  retrievedAt: isoDateTimeSchema,
});

export const draftCorrectionSchema = z.object({
  id: uuidSchema,
  position: z.number().int().nonnegative(),
  originalExcerpt: z.string().min(1).max(10_000),
  proposedText: z.string().min(1).max(10_000),
  explanation: z.string().min(1).max(10_000),
  reviewStatus: correctionReviewStatusSchema,
  reviewedAt: isoDateTimeSchema.nullable(),
  citations: z.array(draftCitationSchema),
});

export const courseDraftSchema = z.object({
  id: uuidSchema,
  reportId: uuidSchema,
  generationNumber: z.number().int().positive(),
  baseReportVersion: z.number().int().positive(),
  status: enrichmentStatusSchema,
  provider: z.string().min(1).max(100).nullable(),
  model: z.string().min(1).max(160).nullable(),
  promptVersion: z.string().min(1).max(80).nullable(),
  content: generatedCourseContentSchema.nullable(),
  failureCode: z.string().max(100).nullable(),
  corrections: z.array(draftCorrectionSchema),
  citations: z.array(draftCitationSchema),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  acceptedAt: isoDateTimeSchema.nullable(),
});

export const reviewDraftCorrectionRequestSchema = z.object({
  reviewStatus: z.enum(["accepted", "rejected", "ask_teacher"]),
});

export type DailyReportStatus = z.infer<typeof dailyReportStatusSchema>;
export type EnrichmentStatus = z.infer<typeof enrichmentStatusSchema>;
export type DailyReportAttachmentKind = z.infer<typeof dailyReportAttachmentKindSchema>;
export type AttachmentProcessingStatus = z.infer<typeof attachmentProcessingStatusSchema>;
export type CorrectionReviewStatus = z.infer<typeof correctionReviewStatusSchema>;
export type SourceTrustTier = z.infer<typeof sourceTrustTierSchema>;
export type CreateDailyReportRequest = z.infer<typeof createDailyReportRequestSchema>;
export type DailyReport = z.infer<typeof dailyReportSchema>;
export type DailyReportListResponse = z.infer<typeof dailyReportListResponseSchema>;
export type DailyReportAttachment = z.infer<typeof dailyReportAttachmentSchema>;
export type DailyReportAttachmentListResponse = z.infer<
  typeof dailyReportAttachmentListResponseSchema
>;
export type GeneratedCourseContent = z.infer<typeof generatedCourseContentSchema>;
export type DraftCitation = z.infer<typeof draftCitationSchema>;
export type DraftCorrection = z.infer<typeof draftCorrectionSchema>;
export type CourseDraft = z.infer<typeof courseDraftSchema>;
export type ReviewDraftCorrectionRequest = z.infer<typeof reviewDraftCorrectionRequestSchema>;
