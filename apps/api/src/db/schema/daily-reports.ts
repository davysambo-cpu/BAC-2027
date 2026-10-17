import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { catalogueItems } from "./curriculum";
import {
  attachmentProcessingStatusEnum,
  correctionReviewStatusEnum,
  dailyReportAttachmentKindEnum,
  dailyReportStatusEnum,
  enrichmentStatusEnum,
  sourceTrustTierEnum,
} from "./enums";
import { chapters, subjects } from "./learning";
import { users } from "./users";

export interface GeneratedCourseContent {
  objectives: string[];
  synthesis: string;
  definitions: Array<{ term: string; explanation: string }>;
  explanations: string[];
  examples: string[];
  unresolvedPoints: string[];
}

export const dailyReports = pgTable(
  "daily_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    catalogueItemId: uuid("catalogue_item_id").references(() => catalogueItems.id, {
      onDelete: "set null",
    }),
    chapterId: uuid("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
    lessonDate: date("lesson_date", { mode: "string" }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    originalSummary: text("original_summary").notNull(),
    understoodPoints: text("understood_points"),
    questions: text("questions"),
    status: dailyReportStatusEnum("status").notNull().default("saved"),
    enrichmentStatus: enrichmentStatusEnum("enrichment_status").notNull().default("not_requested"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("daily_reports_student_date_idx").on(table.studentId, table.lessonDate),
    index("daily_reports_student_updated_idx").on(table.studentId, table.updatedAt),
    index("daily_reports_subject_item_idx").on(table.subjectId, table.catalogueItemId),
    index("daily_reports_enrichment_idx").on(table.enrichmentStatus, table.updatedAt),
  ],
);

export const dailyReportAttachments = pgTable(
  "daily_report_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => dailyReports.id, { onDelete: "cascade" }),
    kind: dailyReportAttachmentKindEnum("kind").notNull(),
    storageKey: text("storage_key").notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 160 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksumSha256: varchar("checksum_sha256", { length: 64 }).notNull(),
    durationSeconds: integer("duration_seconds"),
    processingStatus: attachmentProcessingStatusEnum("processing_status")
      .notNull()
      .default("stored"),
    extractedText: text("extracted_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("daily_report_attachments_storage_key_unique").on(table.storageKey),
    index("daily_report_attachments_report_idx").on(table.reportId, table.createdAt),
    index("daily_report_attachments_processing_idx").on(table.processingStatus, table.updatedAt),
  ],
);

export const courseDrafts = pgTable(
  "course_drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => dailyReports.id, { onDelete: "cascade" }),
    generationNumber: integer("generation_number").notNull(),
    baseReportVersion: integer("base_report_version").notNull(),
    status: enrichmentStatusEnum("status").notNull().default("queued"),
    provider: varchar("provider", { length: 100 }),
    model: varchar("model", { length: 160 }),
    promptVersion: varchar("prompt_version", { length: 80 }),
    content: jsonb("content").$type<GeneratedCourseContent>(),
    failureCode: varchar("failure_code", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("course_drafts_report_generation_unique").on(
      table.reportId,
      table.generationNumber,
    ),
    index("course_drafts_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const draftCorrections = pgTable(
  "draft_corrections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => courseDrafts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    originalExcerpt: text("original_excerpt").notNull(),
    proposedText: text("proposed_text").notNull(),
    explanation: text("explanation").notNull(),
    reviewStatus: correctionReviewStatusEnum("review_status").notNull().default("proposed"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("draft_corrections_draft_position_unique").on(table.draftId, table.position),
    index("draft_corrections_review_idx").on(table.draftId, table.reviewStatus),
  ],
);

export const draftCitations = pgTable(
  "draft_citations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => courseDrafts.id, { onDelete: "cascade" }),
    correctionId: uuid("correction_id").references(() => draftCorrections.id, {
      onDelete: "cascade",
    }),
    position: integer("position").notNull(),
    trustTier: sourceTrustTierEnum("trust_tier").notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    publisher: varchar("publisher", { length: 200 }),
    url: text("url"),
    excerpt: text("excerpt"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("draft_citations_draft_position_unique").on(table.draftId, table.position),
    index("draft_citations_correction_idx").on(table.correctionId),
  ],
);
