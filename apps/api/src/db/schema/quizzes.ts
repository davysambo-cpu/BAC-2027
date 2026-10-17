import {
  boolean,
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

import { questionTypeEnum, quizAttemptStatusEnum, quizStatusEnum } from "./enums";
import { chapters, subjects } from "./learning";
import { users } from "./users";

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    chapterId: uuid("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    estimatedMinutes: integer("estimated_minutes"),
    status: quizStatusEnum("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("quizzes_subject_status_idx").on(table.subjectId, table.status),
    index("quizzes_published_at_idx").on(table.publishedAt),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    type: questionTypeEnum("type").notNull(),
    prompt: text("prompt").notNull(),
    explanation: text("explanation"),
    points: integer("points").notNull().default(1),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("questions_quiz_position_unique").on(table.quizId, table.position),
    index("questions_quiz_idx").on(table.quizId),
  ],
);

export const questionOptions = pgTable(
  "question_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("question_options_question_position_unique").on(table.questionId, table.position),
    index("question_options_question_idx").on(table.questionId),
  ],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: quizAttemptStatusEnum("status").notNull().default("in_progress"),
    score: integer("score"),
    maximumScore: integer("maximum_score"),
    version: integer("version").notNull().default(1),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("quiz_attempts_student_created_idx").on(table.studentId, table.createdAt),
    index("quiz_attempts_quiz_status_idx").on(table.quizId, table.status),
  ],
);

export const attemptAnswers = pgTable(
  "attempt_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => quizAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    selectedOptionIds: uuid("selected_option_ids").array().notNull().default([]),
    answerPayload: jsonb("answer_payload").$type<Record<string, unknown>>().notNull().default({}),
    isCorrect: boolean("is_correct"),
    awardedPoints: integer("awarded_points"),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("attempt_answers_attempt_question_unique").on(table.attemptId, table.questionId),
    index("attempt_answers_attempt_idx").on(table.attemptId),
  ],
);
