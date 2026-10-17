import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const errorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "INVALID_CREDENTIALS",
  "INVALID_INVITATION",
  "INVALID_RESET_CODE",
  "ACCOUNT_DISABLED",
  "USERNAME_UNAVAILABLE",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "RESOURCE_VERSION_CONFLICT",
  "STORAGE_QUOTA_EXCEEDED",
  "UNSUPPORTED_MEDIA_TYPE",
  "SYNC_OPERATION_REJECTED",
  "ENRICHMENT_HEADER_REQUIRED",
  "ENRICHMENT_FAILED",
  "CORRECTIONS_PENDING",
  "KNOWLEDGE_WRITE_HEADER_REQUIRED",
  "REVISION_WRITE_HEADER_REQUIRED",
  "INTERNAL_ERROR",
]);

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string().min(1),
    requestId: z.string().min(1),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
