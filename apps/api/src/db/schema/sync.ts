import {
  bigint,
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

import {
  changeActionEnum,
  changeScopeEnum,
  mutationKindEnum,
  syncMutationStatusEnum,
} from "./enums";
import { users } from "./users";

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").notNull(),
    label: varchar("label", { length: 120 }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("devices_user_client_unique").on(table.userId, table.clientId),
    index("devices_user_last_seen_idx").on(table.userId, table.lastSeenAt),
  ],
);

export const syncMutations = pgTable(
  "sync_mutations",
  {
    operationId: uuid("operation_id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 60 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    kind: mutationKindEnum("kind").notNull(),
    baseVersion: integer("base_version"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: syncMutationStatusEnum("status").notNull(),
    errorCode: varchar("error_code", { length: 80 }),
    errorMessage: text("error_message"),
    clientCreatedAt: timestamp("client_created_at", { withTimezone: true }).notNull(),
    appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sync_mutations_user_applied_idx").on(table.userId, table.appliedAt),
    index("sync_mutations_entity_idx").on(table.entityType, table.entityId),
  ],
);

export const changeFeed = pgTable(
  "change_feed",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    scope: changeScopeEnum("scope").notNull(),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 60 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    entityVersion: integer("entity_version").notNull(),
    action: changeActionEnum("action").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("change_feed_private_cursor_idx").on(table.ownerId, table.id),
    index("change_feed_common_cursor_idx").on(table.scope, table.id),
  ],
);
