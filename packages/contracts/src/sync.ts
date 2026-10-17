import { z } from "zod";

import { isoDateTimeSchema, uuidSchema } from "./common";

export const syncEntityTypeSchema = z.enum([
  "resource",
  "revisionSession",
  "quizAttempt",
  "dailyReport",
  "studentProfile",
]);

export const mutationKindSchema = z.enum(["create", "update", "delete"]);

export const syncMutationSchema = z.object({
  operationId: uuidSchema,
  entityType: syncEntityTypeSchema,
  entityId: uuidSchema,
  kind: mutationKindSchema,
  baseVersion: z.number().int().nonnegative().nullable(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: isoDateTimeSchema,
});

export const syncPushRequestSchema = z.object({
  deviceId: uuidSchema,
  mutations: z.array(syncMutationSchema).max(50),
});

export const syncMutationResultSchema = z.discriminatedUnion("status", [
  z.object({
    operationId: uuidSchema,
    status: z.literal("applied"),
    serverVersion: z.number().int().positive(),
  }),
  z.object({
    operationId: uuidSchema,
    status: z.literal("conflict"),
    serverVersion: z.number().int().positive(),
    serverSnapshot: z.record(z.string(), z.unknown()),
  }),
  z.object({
    operationId: uuidSchema,
    status: z.literal("rejected"),
    code: z.string().min(1),
    message: z.string().min(1),
  }),
]);

export type SyncEntityType = z.infer<typeof syncEntityTypeSchema>;
export type MutationKind = z.infer<typeof mutationKindSchema>;
export type SyncMutation = z.infer<typeof syncMutationSchema>;
export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;
export type SyncMutationResult = z.infer<typeof syncMutationResultSchema>;
