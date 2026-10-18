import { and, asc, eq, isNull, ne } from "drizzle-orm";

import {
  revisionSessionSchema,
  type RevisionSession,
  type RevisionSessionStatus,
} from "@bac-2027/contracts";

import type { AppDatabase } from "../../db/client";
import {
  academicSeries,
  catalogueItems,
  revisionSessions,
  seriesSubjects,
  subjects,
} from "../../db/schema";

export interface PlanningSelection {
  subjectId: string | null;
  catalogueItemId: string | null;
  title: string;
  notes: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  status: RevisionSessionStatus;
  completedAt: Date | null;
}

export interface CreatePlanningSessionInput extends PlanningSelection {
  id: string;
  studentId: string;
  status: "planned";
  completedAt: null;
}

export interface UpdatePlanningSessionInput extends PlanningSelection {
  id: string;
  studentId: string;
  version: number;
  updatedAt: Date;
}

export type PlanningCreateResult = "identifier_conflict" | RevisionSession;
export type PlanningMutationResult = "not_found" | "version_conflict" | RevisionSession;
export type PlanningDeleteResult = "not_found" | "version_conflict" | "deleted";

export interface PlanningRepository {
  list(studentId: string): Promise<RevisionSession[]>;
  subjectIsVisible(seriesCode: string, subjectId: string): Promise<boolean>;
  visibleTopicSubject(seriesCode: string, catalogueItemId: string): Promise<string | null>;
  create(input: CreatePlanningSessionInput): Promise<PlanningCreateResult>;
  update(input: UpdatePlanningSessionInput): Promise<PlanningMutationResult>;
  delete(
    studentId: string,
    sessionId: string,
    version: number,
    deletedAt: Date,
  ): Promise<PlanningDeleteResult>;
}

const selection = {
  id: revisionSessions.id,
  subjectId: revisionSessions.subjectId,
  subjectName: subjects.name,
  catalogueItemId: revisionSessions.catalogueItemId,
  catalogueItemTitle: catalogueItems.title,
  title: revisionSessions.title,
  notes: revisionSessions.notes,
  scheduledAt: revisionSessions.scheduledAt,
  durationMinutes: revisionSessions.durationMinutes,
  status: revisionSessions.status,
  completedAt: revisionSessions.completedAt,
  version: revisionSessions.version,
  createdAt: revisionSessions.createdAt,
  updatedAt: revisionSessions.updatedAt,
};

type PlanningRow = {
  id: string;
  subjectId: string | null;
  subjectName: string | null;
  catalogueItemId: string | null;
  catalogueItemTitle: string | null;
  title: string;
  notes: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  status: RevisionSessionStatus;
  completedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

function mapSession(row: PlanningRow): RevisionSession {
  return revisionSessionSchema.parse({
    ...row,
    scheduledAt: row.scheduledAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function matchesRetriedUpdate(
  session: RevisionSession,
  input: UpdatePlanningSessionInput,
): boolean {
  return (
    session.version === input.version + 1 &&
    session.subjectId === input.subjectId &&
    session.catalogueItemId === input.catalogueItemId &&
    session.title === input.title &&
    session.notes === input.notes &&
    session.scheduledAt === input.scheduledAt.toISOString() &&
    session.durationMinutes === input.durationMinutes &&
    session.status === input.status
  );
}

const visibleSubjectConditions = (seriesCode: string) =>
  and(
    eq(academicSeries.code, seriesCode),
    eq(academicSeries.isActive, true),
    eq(seriesSubjects.isActive, true),
    ne(seriesSubjects.validationStatus, "excluded"),
    eq(subjects.isActive, true),
  );

export class DrizzlePlanningRepository implements PlanningRepository {
  constructor(private readonly database: AppDatabase) {}

  async list(studentId: string): Promise<RevisionSession[]> {
    const rows = await this.database
      .select(selection)
      .from(revisionSessions)
      .leftJoin(subjects, eq(subjects.id, revisionSessions.subjectId))
      .leftJoin(catalogueItems, eq(catalogueItems.id, revisionSessions.catalogueItemId))
      .where(and(eq(revisionSessions.studentId, studentId), isNull(revisionSessions.deletedAt)))
      .orderBy(asc(revisionSessions.scheduledAt), asc(revisionSessions.createdAt));
    return rows.map(mapSession);
  }

  async subjectIsVisible(seriesCode: string, subjectId: string): Promise<boolean> {
    const [subject] = await this.database
      .select({ id: subjects.id })
      .from(seriesSubjects)
      .innerJoin(academicSeries, eq(academicSeries.id, seriesSubjects.seriesId))
      .innerJoin(subjects, eq(subjects.id, seriesSubjects.subjectId))
      .where(and(visibleSubjectConditions(seriesCode), eq(subjects.id, subjectId)))
      .limit(1);
    return Boolean(subject);
  }

  async visibleTopicSubject(seriesCode: string, catalogueItemId: string): Promise<string | null> {
    const [topic] = await this.database
      .select({ subjectId: catalogueItems.subjectId })
      .from(seriesSubjects)
      .innerJoin(academicSeries, eq(academicSeries.id, seriesSubjects.seriesId))
      .innerJoin(subjects, eq(subjects.id, seriesSubjects.subjectId))
      .innerJoin(catalogueItems, eq(catalogueItems.subjectId, subjects.id))
      .where(
        and(
          visibleSubjectConditions(seriesCode),
          eq(catalogueItems.id, catalogueItemId),
          eq(catalogueItems.isActive, true),
          ne(catalogueItems.seriesDScope, "explicitly_excludes"),
          ne(catalogueItems.validationStatus, "excluded"),
        ),
      )
      .limit(1);
    return topic?.subjectId ?? null;
  }

  async create(input: CreatePlanningSessionInput): Promise<PlanningCreateResult> {
    const [created] = await this.database
      .insert(revisionSessions)
      .values({
        id: input.id,
        studentId: input.studentId,
        subjectId: input.subjectId,
        catalogueItemId: input.catalogueItemId,
        title: input.title,
        notes: input.notes,
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        status: input.status,
        completedAt: input.completedAt,
      })
      .onConflictDoNothing({ target: revisionSessions.id })
      .returning({ id: revisionSessions.id });
    const session = await this.findById(input.studentId, created?.id ?? input.id);
    return session ?? "identifier_conflict";
  }

  async update(input: UpdatePlanningSessionInput): Promise<PlanningMutationResult> {
    const [existing] = await this.database
      .select({
        version: revisionSessions.version,
        completedAt: revisionSessions.completedAt,
      })
      .from(revisionSessions)
      .where(
        and(
          eq(revisionSessions.id, input.id),
          eq(revisionSessions.studentId, input.studentId),
          isNull(revisionSessions.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return "not_found";
    if (existing.version !== input.version) {
      const current = await this.findById(input.studentId, input.id);
      return current && matchesRetriedUpdate(current, input) ? current : "version_conflict";
    }

    const [updated] = await this.database
      .update(revisionSessions)
      .set({
        subjectId: input.subjectId,
        catalogueItemId: input.catalogueItemId,
        title: input.title,
        notes: input.notes,
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        status: input.status,
        completedAt:
          input.status === "completed" ? (existing.completedAt ?? input.completedAt) : null,
        version: input.version + 1,
        updatedAt: input.updatedAt,
      })
      .where(
        and(
          eq(revisionSessions.id, input.id),
          eq(revisionSessions.studentId, input.studentId),
          eq(revisionSessions.version, input.version),
          isNull(revisionSessions.deletedAt),
        ),
      )
      .returning({ id: revisionSessions.id });
    if (updated) return (await this.findById(input.studentId, updated.id)) ?? "not_found";
    const current = await this.findById(input.studentId, input.id);
    return current && matchesRetriedUpdate(current, input) ? current : "version_conflict";
  }

  async delete(
    studentId: string,
    sessionId: string,
    version: number,
    deletedAt: Date,
  ): Promise<PlanningDeleteResult> {
    const [deleted] = await this.database
      .update(revisionSessions)
      .set({ deletedAt, updatedAt: deletedAt, version: version + 1 })
      .where(
        and(
          eq(revisionSessions.id, sessionId),
          eq(revisionSessions.studentId, studentId),
          eq(revisionSessions.version, version),
          isNull(revisionSessions.deletedAt),
        ),
      )
      .returning({ id: revisionSessions.id });
    if (deleted) return "deleted";
    const [existing] = await this.database
      .select({ deletedAt: revisionSessions.deletedAt })
      .from(revisionSessions)
      .where(and(eq(revisionSessions.id, sessionId), eq(revisionSessions.studentId, studentId)))
      .limit(1);
    if (!existing) return "not_found";
    return existing.deletedAt ? "deleted" : "version_conflict";
  }

  private async findById(studentId: string, sessionId: string): Promise<RevisionSession | null> {
    const [row] = await this.database
      .select(selection)
      .from(revisionSessions)
      .leftJoin(subjects, eq(subjects.id, revisionSessions.subjectId))
      .leftJoin(catalogueItems, eq(catalogueItems.id, revisionSessions.catalogueItemId))
      .where(
        and(
          eq(revisionSessions.id, sessionId),
          eq(revisionSessions.studentId, studentId),
          isNull(revisionSessions.deletedAt),
        ),
      )
      .limit(1);
    return row ? mapSession(row) : null;
  }
}
