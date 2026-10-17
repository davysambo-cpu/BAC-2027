import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { users } from "./users";

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: varchar("action", { length: 100 }).notNull(),
    targetType: varchar("target_type", { length: 80 }).notNull(),
    targetId: uuid("target_id"),
    requestId: varchar("request_id", { length: 120 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_audit_logs_actor_created_idx").on(table.actorId, table.createdAt),
    index("admin_audit_logs_target_idx").on(table.targetType, table.targetId),
  ],
);
