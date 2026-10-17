import { index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { revisionSessionStatusEnum } from "./enums";
import { chapters, subjects } from "./learning";
import { users } from "./users";

export const revisionSessions = pgTable(
  "revision_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    chapterId: uuid("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
    title: varchar("title", { length: 240 }).notNull(),
    notes: text("notes"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    status: revisionSessionStatusEnum("status").notNull().default("planned"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("revision_sessions_student_date_idx").on(table.studentId, table.scheduledAt),
    index("revision_sessions_student_status_idx").on(table.studentId, table.status),
  ],
);
