import { z } from "zod";

import { isoDateTimeSchema, uuidSchema } from "./common";

export const revisionSessionStatusSchema = z.enum(["planned", "completed", "cancelled"]);

const revisionSessionFieldsSchema = z.object({
  subjectId: uuidSchema.nullable(),
  catalogueItemId: uuidSchema.nullable(),
  title: z.string().trim().min(2).max(240),
  notes: z.string().trim().max(2_000).nullable().default(null),
  scheduledAt: isoDateTimeSchema,
  durationMinutes: z.number().int().min(15).max(240),
});

export const createRevisionSessionRequestSchema = revisionSessionFieldsSchema.extend({
  id: uuidSchema,
});

export const updateRevisionSessionRequestSchema = revisionSessionFieldsSchema.extend({
  version: z.number().int().positive(),
  status: revisionSessionStatusSchema,
});

export const deleteRevisionSessionRequestSchema = z.object({
  version: z.number().int().positive(),
});

export const revisionSessionSchema = revisionSessionFieldsSchema.extend({
  id: uuidSchema,
  subjectName: z.string().min(1).max(160).nullable(),
  catalogueItemTitle: z.string().min(1).max(400).nullable(),
  status: revisionSessionStatusSchema,
  completedAt: isoDateTimeSchema.nullable(),
  version: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const revisionSessionListResponseSchema = z.object({
  generatedAt: isoDateTimeSchema,
  sessions: z.array(revisionSessionSchema),
});

export type RevisionSessionStatus = z.infer<typeof revisionSessionStatusSchema>;
export type CreateRevisionSessionRequest = z.infer<typeof createRevisionSessionRequestSchema>;
export type UpdateRevisionSessionRequest = z.infer<typeof updateRevisionSessionRequestSchema>;
export type DeleteRevisionSessionRequest = z.infer<typeof deleteRevisionSessionRequestSchema>;
export type RevisionSession = z.infer<typeof revisionSessionSchema>;
export type RevisionSessionListResponse = z.infer<typeof revisionSessionListResponseSchema>;
