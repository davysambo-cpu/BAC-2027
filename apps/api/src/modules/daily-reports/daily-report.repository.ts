import { and, desc, eq, isNull, ne } from "drizzle-orm";

import type { CreateDailyReportRequest, DailyReport } from "@bac-2027/contracts";

import type { AppDatabase } from "../../db/client";
import {
  academicSeries,
  catalogueItems,
  chapters,
  dailyReports,
  seriesSubjects,
  subjects,
} from "../../db/schema";

export interface DailyReportSelection {
  subjectAvailable: boolean;
  catalogueItemAvailable: boolean;
  chapterAvailable: boolean;
}

export interface DailyReportRepository {
  validateSelection(
    seriesCode: string,
    subjectId: string,
    catalogueItemId: string | null,
    chapterId: string | null,
  ): Promise<DailyReportSelection>;
  create(studentId: string, input: CreateDailyReportRequest, now: Date): Promise<DailyReport>;
  listForStudent(studentId: string): Promise<DailyReport[]>;
}

const selection = {
  id: dailyReports.id,
  studentId: dailyReports.studentId,
  subjectId: dailyReports.subjectId,
  catalogueItemId: dailyReports.catalogueItemId,
  chapterId: dailyReports.chapterId,
  lessonDate: dailyReports.lessonDate,
  title: dailyReports.title,
  originalSummary: dailyReports.originalSummary,
  understoodPoints: dailyReports.understoodPoints,
  questions: dailyReports.questions,
  status: dailyReports.status,
  enrichmentStatus: dailyReports.enrichmentStatus,
  version: dailyReports.version,
  createdAt: dailyReports.createdAt,
  updatedAt: dailyReports.updatedAt,
};

type SelectedDailyReport = typeof dailyReports.$inferSelect;

function mapDailyReport(
  row: Pick<
    SelectedDailyReport,
    | "id"
    | "studentId"
    | "subjectId"
    | "catalogueItemId"
    | "chapterId"
    | "lessonDate"
    | "title"
    | "originalSummary"
    | "understoodPoints"
    | "questions"
    | "status"
    | "enrichmentStatus"
    | "version"
    | "createdAt"
    | "updatedAt"
  >,
): DailyReport {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class DrizzleDailyReportRepository implements DailyReportRepository {
  constructor(private readonly database: AppDatabase) {}

  async validateSelection(
    seriesCode: string,
    subjectId: string,
    catalogueItemId: string | null,
    chapterId: string | null,
  ): Promise<DailyReportSelection> {
    const [subject] = await this.database
      .select({ id: subjects.id })
      .from(seriesSubjects)
      .innerJoin(academicSeries, eq(academicSeries.id, seriesSubjects.seriesId))
      .innerJoin(subjects, eq(subjects.id, seriesSubjects.subjectId))
      .where(
        and(
          eq(academicSeries.code, seriesCode),
          eq(academicSeries.isActive, true),
          eq(seriesSubjects.subjectId, subjectId),
          eq(seriesSubjects.isActive, true),
          ne(seriesSubjects.validationStatus, "excluded"),
          eq(subjects.isActive, true),
        ),
      )
      .limit(1);

    let catalogueItemAvailable = catalogueItemId === null;
    if (catalogueItemId) {
      const [item] = await this.database
        .select({ id: catalogueItems.id })
        .from(catalogueItems)
        .where(
          and(
            eq(catalogueItems.id, catalogueItemId),
            eq(catalogueItems.subjectId, subjectId),
            eq(catalogueItems.isActive, true),
            ne(catalogueItems.seriesDScope, "explicitly_excludes"),
            ne(catalogueItems.validationStatus, "excluded"),
          ),
        )
        .limit(1);
      catalogueItemAvailable = Boolean(item);
    }

    let chapterAvailable = chapterId === null;
    if (chapterId) {
      const [chapter] = await this.database
        .select({ id: chapters.id })
        .from(chapters)
        .where(
          and(
            eq(chapters.id, chapterId),
            eq(chapters.subjectId, subjectId),
            eq(chapters.isActive, true),
          ),
        )
        .limit(1);
      chapterAvailable = Boolean(chapter);
    }

    return {
      subjectAvailable: Boolean(subject),
      catalogueItemAvailable,
      chapterAvailable,
    };
  }

  async create(
    studentId: string,
    input: CreateDailyReportRequest,
    now: Date,
  ): Promise<DailyReport> {
    const [created] = await this.database
      .insert(dailyReports)
      .values({
        id: input.id,
        studentId,
        subjectId: input.subjectId,
        catalogueItemId: input.catalogueItemId,
        chapterId: input.chapterId,
        lessonDate: input.lessonDate,
        title: input.title,
        originalSummary: input.originalSummary,
        understoodPoints: input.understoodPoints,
        questions: input.questions,
        status: input.status,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: dailyReports.id })
      .returning(selection);
    if (created) return mapDailyReport(created);

    const [existing] = await this.database
      .select(selection)
      .from(dailyReports)
      .where(and(eq(dailyReports.id, input.id), eq(dailyReports.studentId, studentId)))
      .limit(1);
    if (!existing) throw new Error("Daily report identifier is already in use.");
    return mapDailyReport(existing);
  }

  async listForStudent(studentId: string): Promise<DailyReport[]> {
    const rows = await this.database
      .select(selection)
      .from(dailyReports)
      .where(and(eq(dailyReports.studentId, studentId), isNull(dailyReports.deletedAt)))
      .orderBy(desc(dailyReports.lessonDate), desc(dailyReports.updatedAt));
    return rows.map(mapDailyReport);
  }
}
