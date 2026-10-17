import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { resourceKindEnum, resourceStatusEnum, resourceVisibilityEnum } from "./enums";
import { chapters, subjects } from "./learning";
import { users } from "./users";

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    chapterId: uuid("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
    kind: resourceKindEnum("kind").notNull(),
    visibility: resourceVisibilityEnum("visibility").notNull().default("private"),
    status: resourceStatusEnum("status").notNull().default("draft"),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    noteContent: text("note_content"),
    sourceReference: text("source_reference"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("resources_owner_updated_idx").on(table.ownerId, table.updatedAt),
    index("resources_subject_chapter_idx").on(table.subjectId, table.chapterId),
    index("resources_visibility_status_idx").on(table.visibility, table.status),
  ],
);

export const resourceFiles = pgTable(
  "resource_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 160 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    checksumSha256: varchar("checksum_sha256", { length: 64 }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("resource_files_storage_key_unique").on(table.storageKey),
    index("resource_files_resource_idx").on(table.resourceId),
  ],
);
