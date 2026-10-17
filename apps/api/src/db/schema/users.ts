import { sql } from "drizzle-orm";
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

import { sessionDeviceTypeEnum, userRoleEnum, userStatusEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 50 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    passwordHash: text("password_hash"),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    role: userRoleEnum("role").notNull().default("student"),
    status: userStatusEnum("status").notNull().default("invited"),
    storageQuotaBytes: bigint("storage_quota_bytes", { mode: "number" })
      .notNull()
      .default(262_144_000),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("users_username_unique").on(sql`lower(${table.username})`),
    index("users_role_status_idx").on(table.role, table.status),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 50 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    tokenHash: text("token_hash").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("invitations_token_hash_unique").on(table.tokenHash),
    index("invitations_username_idx").on(table.username),
    index("invitations_expires_at_idx").on(table.expiresAt),
  ],
);

export const studentProfiles = pgTable("student_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  seriesCode: varchar("series_code", { length: 20 }).notNull().default("D"),
  preferences: jsonb("preferences").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: bigint("version", { mode: "number" }).notNull().default(1),
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    deviceType: sessionDeviceTypeEnum("device_type").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_hash_unique").on(table.tokenHash),
    index("auth_sessions_user_expires_idx").on(table.userId, table.expiresAt),
  ],
);

export const passwordResetCodes = pgTable(
  "password_reset_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("password_reset_codes_user_expires_idx").on(table.userId, table.expiresAt),
    index("password_reset_codes_hash_idx").on(table.codeHash),
  ],
);
