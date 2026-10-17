import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { catalogueItems } from "./curriculum";
import { revisionAssessmentEnum } from "./enums";
import { users } from "./users";

/**
 * Journal personnel append-only des auto-évaluations. Le programme donne la
 * trame ; chaque ligne mémorise une révision réellement effectuée par l'élève.
 */
export const topicRevisionReviews = pgTable(
  "topic_revision_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    catalogueItemId: uuid("catalogue_item_id")
      .notNull()
      .references(() => catalogueItems.id, { onDelete: "cascade" }),
    assessment: revisionAssessmentEnum("assessment").notNull(),
    note: text("note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("topic_revision_reviews_student_next_idx").on(table.studentId, table.nextReviewAt),
    index("topic_revision_reviews_student_item_idx").on(
      table.studentId,
      table.catalogueItemId,
      table.reviewedAt,
    ),
  ],
);
