import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["student", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["invited", "active", "disabled"]);
export const sessionDeviceTypeEnum = pgEnum("session_device_type", ["personal", "shared"]);

export const resourceKindEnum = pgEnum("resource_kind", [
  "note",
  "document",
  "image",
  "audio",
  "video",
]);
export const resourceVisibilityEnum = pgEnum("resource_visibility", ["private", "common"]);
export const resourceStatusEnum = pgEnum("resource_status", ["draft", "published", "archived"]);

export const curriculumSourceKindEnum = pgEnum("curriculum_source_kind", [
  "administrative",
  "pedagogical_catalogue",
  "school_material",
  "web",
]);
export const contentValidationStatusEnum = pgEnum("content_validation_status", [
  "owner_provided",
  "pedagogically_validated",
  "institutionally_validated",
  "excluded",
]);
export const seriesScopeStatusEnum = pgEnum("series_scope_status", [
  "explicitly_includes",
  "unspecified",
  "explicitly_excludes",
]);

export const dailyReportStatusEnum = pgEnum("daily_report_status", ["draft", "saved", "archived"]);
export const enrichmentStatusEnum = pgEnum("enrichment_status", [
  "not_requested",
  "queued",
  "processing",
  "needs_review",
  "accepted",
  "failed",
]);
export const dailyReportAttachmentKindEnum = pgEnum("daily_report_attachment_kind", [
  "image",
  "audio",
]);
export const attachmentProcessingStatusEnum = pgEnum("attachment_processing_status", [
  "stored",
  "queued",
  "processing",
  "ready",
  "failed",
]);
export const correctionReviewStatusEnum = pgEnum("correction_review_status", [
  "proposed",
  "accepted",
  "rejected",
  "ask_teacher",
]);
export const sourceTrustTierEnum = pgEnum("source_trust_tier", [
  "institutional",
  "curated",
  "catalogue",
  "web",
]);

export const revisionSessionStatusEnum = pgEnum("revision_session_status", [
  "planned",
  "completed",
  "cancelled",
]);

export const quizStatusEnum = pgEnum("quiz_status", ["draft", "published", "archived"]);
export const questionTypeEnum = pgEnum("question_type", ["single_choice", "multiple_choice"]);
export const quizAttemptStatusEnum = pgEnum("quiz_attempt_status", [
  "in_progress",
  "submitted",
  "abandoned",
]);

export const mutationKindEnum = pgEnum("mutation_kind", ["create", "update", "delete"]);
export const syncMutationStatusEnum = pgEnum("sync_mutation_status", [
  "applied",
  "conflict",
  "rejected",
]);
export const changeScopeEnum = pgEnum("change_scope", ["private", "common"]);
export const changeActionEnum = pgEnum("change_action", ["upsert", "delete"]);
