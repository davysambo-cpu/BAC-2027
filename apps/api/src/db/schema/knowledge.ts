import {
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

import type { KnowledgeCardContent, KnowledgeCorrectionRule } from "@bac-2027/contracts";

import { catalogueItems } from "./curriculum";
import { resourceStatusEnum, sourceTrustTierEnum } from "./enums";
import { users } from "./users";

export const knowledgeCards = pgTable(
  "knowledge_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    catalogueItemId: uuid("catalogue_item_id")
      .notNull()
      .references(() => catalogueItems.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 240 }).notNull(),
    status: resourceStatusEnum("status").notNull().default("draft"),
    trustTier: sourceTrustTierEnum("trust_tier").notNull(),
    sourceTitle: varchar("source_title", { length: 300 }).notNull(),
    sourcePublisher: varchar("source_publisher", { length: 200 }).notNull(),
    sourceUrl: text("source_url"),
    sourceExcerpt: text("source_excerpt").notNull(),
    content: jsonb("content").$type<KnowledgeCardContent>().notNull(),
    correctionRules: jsonb("correction_rules")
      .$type<KnowledgeCorrectionRule[]>()
      .notNull()
      .default([]),
    version: integer("version").notNull().default(1),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("knowledge_cards_catalogue_item_unique").on(table.catalogueItemId),
    index("knowledge_cards_status_updated_idx").on(table.status, table.updatedAt),
  ],
);
