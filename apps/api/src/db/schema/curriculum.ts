import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import {
  contentValidationStatusEnum,
  curriculumSourceKindEnum,
  seriesScopeStatusEnum,
} from "./enums";
import { chapters, subjects } from "./learning";

export const academicSeries = pgTable(
  "academic_series",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 20 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    educationLevel: varchar("education_level", { length: 40 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("academic_series_code_unique").on(table.code)],
);

export const curriculumSources = pgTable(
  "curriculum_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 100 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    kind: curriculumSourceKindEnum("kind").notNull(),
    validationStatus: contentValidationStatusEnum("validation_status")
      .notNull()
      .default("owner_provided"),
    publisherLabel: varchar("publisher_label", { length: 160 }),
    originalFileName: varchar("original_file_name", { length: 255 }),
    checksumSha256: varchar("checksum_sha256", { length: 64 }),
    pageCount: integer("page_count"),
    sourceUrl: text("source_url"),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("curriculum_sources_code_unique").on(table.code),
    uniqueIndex("curriculum_sources_checksum_unique").on(table.checksumSha256),
    index("curriculum_sources_validation_idx").on(table.validationStatus),
  ],
);

export const seriesSubjects = pgTable(
  "series_subjects",
  {
    seriesId: uuid("series_id")
      .notNull()
      .references(() => academicSeries.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    validationStatus: contentValidationStatusEnum("validation_status")
      .notNull()
      .default("owner_provided"),
    sourceReference: text("source_reference"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.seriesId, table.subjectId] }),
    index("series_subjects_series_order_idx").on(table.seriesId, table.position),
  ],
);

export const catalogueItems = pgTable(
  "catalogue_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 100 }).notNull(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => curriculumSources.id, { onDelete: "restrict" }),
    canonicalChapterId: uuid("canonical_chapter_id").references(() => chapters.id, {
      onDelete: "set null",
    }),
    sourceSection: varchar("source_section", { length: 80 }).notNull(),
    sourcePosition: integer("source_position").notNull(),
    subjectPosition: integer("subject_position").notNull(),
    title: varchar("title", { length: 400 }).notNull(),
    sourceUrl: text("source_url"),
    seriesMention: varchar("series_mention", { length: 80 }),
    seriesLabels: jsonb("series_labels").$type<string[]>().notNull().default([]),
    seriesDScope: seriesScopeStatusEnum("series_d_scope").notNull(),
    validationStatus: contentValidationStatusEnum("validation_status")
      .notNull()
      .default("owner_provided"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("catalogue_items_code_unique").on(table.code),
    uniqueIndex("catalogue_items_source_position_unique").on(table.sourceId, table.sourcePosition),
    index("catalogue_items_subject_order_idx").on(table.subjectId, table.subjectPosition),
    index("catalogue_items_student_visibility_idx").on(
      table.subjectId,
      table.seriesDScope,
      table.isActive,
    ),
  ],
);
