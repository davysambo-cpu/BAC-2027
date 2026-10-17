import { and, asc, desc, eq, isNotNull, isNull, ne } from "drizzle-orm";

import type {
  EnrichmentStatus,
  RevisionAssessment,
  TopicRevisionReview,
} from "@bac-2027/contracts";

import type { AppDatabase } from "../../db/client";
import {
  academicSeries,
  catalogueItems,
  dailyReports,
  seriesSubjects,
  subjects,
  topicRevisionReviews,
} from "../../db/schema";

export interface RevisionProgramTopic {
  catalogueItemId: string;
  subjectId: string;
  subjectName: string;
  title: string;
  section: string;
}

export interface RevisionReportActivity {
  catalogueItemId: string;
  lessonDate: string;
  enrichmentStatus: EnrichmentStatus;
}

export interface CreateRevisionReviewInput {
  id: string;
  studentId: string;
  catalogueItemId: string;
  assessment: RevisionAssessment;
  note: string | null;
  reviewedAt: Date;
  nextReviewAt: Date;
}

export interface RevisionRepository {
  listProgramTopics(seriesCode: string): Promise<RevisionProgramTopic[]>;
  catalogueItemIsVisible(seriesCode: string, catalogueItemId: string): Promise<boolean>;
  listReportActivity(studentId: string): Promise<RevisionReportActivity[]>;
  listReviews(studentId: string): Promise<TopicRevisionReview[]>;
  createReview(input: CreateRevisionReviewInput): Promise<TopicRevisionReview>;
}

const visibleTopicConditions = (seriesCode: string) =>
  and(
    eq(academicSeries.code, seriesCode),
    eq(academicSeries.isActive, true),
    eq(seriesSubjects.isActive, true),
    ne(seriesSubjects.validationStatus, "excluded"),
    eq(subjects.isActive, true),
    eq(catalogueItems.isActive, true),
    ne(catalogueItems.seriesDScope, "explicitly_excludes"),
    ne(catalogueItems.validationStatus, "excluded"),
  );

function mapReview(row: typeof topicRevisionReviews.$inferSelect): TopicRevisionReview {
  return {
    id: row.id,
    catalogueItemId: row.catalogueItemId,
    assessment: row.assessment,
    note: row.note,
    reviewedAt: row.reviewedAt.toISOString(),
    nextReviewAt: row.nextReviewAt.toISOString(),
  };
}

export class DrizzleRevisionRepository implements RevisionRepository {
  constructor(private readonly database: AppDatabase) {}

  async listProgramTopics(seriesCode: string): Promise<RevisionProgramTopic[]> {
    return this.database
      .select({
        catalogueItemId: catalogueItems.id,
        subjectId: subjects.id,
        subjectName: subjects.name,
        title: catalogueItems.title,
        section: catalogueItems.sourceSection,
      })
      .from(seriesSubjects)
      .innerJoin(academicSeries, eq(academicSeries.id, seriesSubjects.seriesId))
      .innerJoin(subjects, eq(subjects.id, seriesSubjects.subjectId))
      .innerJoin(catalogueItems, eq(catalogueItems.subjectId, subjects.id))
      .where(visibleTopicConditions(seriesCode))
      .orderBy(
        asc(seriesSubjects.position),
        asc(catalogueItems.subjectPosition),
        asc(catalogueItems.title),
      );
  }

  async catalogueItemIsVisible(seriesCode: string, catalogueItemId: string): Promise<boolean> {
    const [item] = await this.database
      .select({ id: catalogueItems.id })
      .from(seriesSubjects)
      .innerJoin(academicSeries, eq(academicSeries.id, seriesSubjects.seriesId))
      .innerJoin(subjects, eq(subjects.id, seriesSubjects.subjectId))
      .innerJoin(catalogueItems, eq(catalogueItems.subjectId, subjects.id))
      .where(and(visibleTopicConditions(seriesCode), eq(catalogueItems.id, catalogueItemId)))
      .limit(1);
    return Boolean(item);
  }

  async listReportActivity(studentId: string): Promise<RevisionReportActivity[]> {
    const rows = await this.database
      .select({
        catalogueItemId: dailyReports.catalogueItemId,
        lessonDate: dailyReports.lessonDate,
        enrichmentStatus: dailyReports.enrichmentStatus,
      })
      .from(dailyReports)
      .where(
        and(
          eq(dailyReports.studentId, studentId),
          isNull(dailyReports.deletedAt),
          isNotNull(dailyReports.catalogueItemId),
        ),
      );
    return rows.map((row) => ({
      catalogueItemId: row.catalogueItemId!,
      lessonDate: row.lessonDate,
      enrichmentStatus: row.enrichmentStatus,
    }));
  }

  async listReviews(studentId: string): Promise<TopicRevisionReview[]> {
    const rows = await this.database
      .select()
      .from(topicRevisionReviews)
      .where(eq(topicRevisionReviews.studentId, studentId))
      .orderBy(desc(topicRevisionReviews.reviewedAt), desc(topicRevisionReviews.createdAt));
    return rows.map(mapReview);
  }

  async createReview(input: CreateRevisionReviewInput): Promise<TopicRevisionReview> {
    const [created] = await this.database
      .insert(topicRevisionReviews)
      .values({
        id: input.id,
        studentId: input.studentId,
        catalogueItemId: input.catalogueItemId,
        assessment: input.assessment,
        note: input.note,
        reviewedAt: input.reviewedAt,
        nextReviewAt: input.nextReviewAt,
      })
      .onConflictDoNothing({ target: topicRevisionReviews.id })
      .returning();
    if (created) return mapReview(created);

    const [existing] = await this.database
      .select()
      .from(topicRevisionReviews)
      .where(
        and(
          eq(topicRevisionReviews.id, input.id),
          eq(topicRevisionReviews.studentId, input.studentId),
        ),
      )
      .limit(1);
    if (!existing) throw new Error("Revision review identifier is already in use.");
    return mapReview(existing);
  }
}
