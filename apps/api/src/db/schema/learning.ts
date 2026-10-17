import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 40 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    position: integer("position").notNull().default(0),
    isOfficial: boolean("is_official").notNull().default(false),
    sourceReference: text("source_reference"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("subjects_code_unique").on(table.code),
    index("subjects_order_idx").on(table.position),
  ],
);

export const chapters = pgTable(
  "chapters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 60 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    position: integer("position").notNull().default(0),
    isOfficial: boolean("is_official").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("chapters_subject_code_unique").on(table.subjectId, table.code),
    index("chapters_subject_order_idx").on(table.subjectId, table.position),
  ],
);
