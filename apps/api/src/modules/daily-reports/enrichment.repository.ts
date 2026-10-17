import { and, desc, eq, isNull } from "drizzle-orm";

import type { CorrectionReviewStatus, CourseDraft, DraftCitation } from "@bac-2027/contracts";

import type { AppDatabase } from "../../db/client";
import {
  catalogueItems,
  courseDrafts,
  curriculumSources,
  dailyReports,
  draftCitations,
  draftCorrections,
  subjects,
} from "../../db/schema";
import type { EnrichmentReportInput, EnrichmentResult } from "./enrichment.provider";

export interface SaveEnrichmentInput {
  reportId: string;
  studentId: string;
  baseReportVersion: number;
  result: EnrichmentResult;
  now: Date;
}

export type AcceptDraftResult = "accepted" | "not_found" | "pending_corrections";

export interface EnrichmentRepository {
  findReportInput(studentId: string, reportId: string): Promise<EnrichmentReportInput | null>;
  findLatestDraft(studentId: string, reportId: string): Promise<CourseDraft | null>;
  save(input: SaveEnrichmentInput): Promise<CourseDraft>;
  markReportFailed(studentId: string, reportId: string, now: Date): Promise<void>;
  reviewCorrection(
    studentId: string,
    reportId: string,
    correctionId: string,
    status: Exclude<CorrectionReviewStatus, "proposed">,
    now: Date,
  ): Promise<boolean>;
  acceptLatestDraft(studentId: string, reportId: string, now: Date): Promise<AcceptDraftResult>;
}

const draftSelection = {
  id: courseDrafts.id,
  reportId: courseDrafts.reportId,
  generationNumber: courseDrafts.generationNumber,
  baseReportVersion: courseDrafts.baseReportVersion,
  status: courseDrafts.status,
  provider: courseDrafts.provider,
  model: courseDrafts.model,
  promptVersion: courseDrafts.promptVersion,
  content: courseDrafts.content,
  failureCode: courseDrafts.failureCode,
  createdAt: courseDrafts.createdAt,
  updatedAt: courseDrafts.updatedAt,
  acceptedAt: courseDrafts.acceptedAt,
};

export class DrizzleEnrichmentRepository implements EnrichmentRepository {
  constructor(private readonly database: AppDatabase) {}

  async findReportInput(
    studentId: string,
    reportId: string,
  ): Promise<EnrichmentReportInput | null> {
    const [row] = await this.database
      .select({
        reportId: dailyReports.id,
        version: dailyReports.version,
        title: dailyReports.title,
        originalSummary: dailyReports.originalSummary,
        understoodPoints: dailyReports.understoodPoints,
        questions: dailyReports.questions,
        subjectName: subjects.name,
        itemId: catalogueItems.id,
        itemTitle: catalogueItems.title,
        itemSection: catalogueItems.sourceSection,
        itemUrl: catalogueItems.sourceUrl,
        itemValidationStatus: catalogueItems.validationStatus,
        sourceId: curriculumSources.id,
        sourceTitle: curriculumSources.title,
        sourcePublisher: curriculumSources.publisherLabel,
        sourceUrl: curriculumSources.sourceUrl,
        sourceValidationStatus: curriculumSources.validationStatus,
      })
      .from(dailyReports)
      .innerJoin(subjects, eq(subjects.id, dailyReports.subjectId))
      .leftJoin(catalogueItems, eq(catalogueItems.id, dailyReports.catalogueItemId))
      .leftJoin(curriculumSources, eq(curriculumSources.id, catalogueItems.sourceId))
      .where(
        and(
          eq(dailyReports.id, reportId),
          eq(dailyReports.studentId, studentId),
          isNull(dailyReports.deletedAt),
        ),
      )
      .limit(1);

    if (!row) return null;
    return {
      report: {
        id: row.reportId,
        version: row.version,
        title: row.title,
        originalSummary: row.originalSummary,
        understoodPoints: row.understoodPoints,
        questions: row.questions,
      },
      subjectName: row.subjectName,
      catalogueItem:
        row.itemId && row.itemTitle && row.itemSection && row.itemValidationStatus
          ? {
              title: row.itemTitle,
              section: row.itemSection,
              url: row.itemUrl,
              validationStatus: row.itemValidationStatus,
            }
          : null,
      catalogueSource:
        row.sourceId && row.sourceTitle && row.sourceValidationStatus
          ? {
              title: row.sourceTitle,
              publisher: row.sourcePublisher,
              url: row.sourceUrl,
              validationStatus: row.sourceValidationStatus,
            }
          : null,
    };
  }

  async findLatestDraft(studentId: string, reportId: string): Promise<CourseDraft | null> {
    const [draft] = await this.database
      .select(draftSelection)
      .from(courseDrafts)
      .innerJoin(dailyReports, eq(dailyReports.id, courseDrafts.reportId))
      .where(
        and(
          eq(courseDrafts.reportId, reportId),
          eq(dailyReports.studentId, studentId),
          isNull(dailyReports.deletedAt),
        ),
      )
      .orderBy(desc(courseDrafts.generationNumber))
      .limit(1);
    if (!draft) return null;
    return this.hydrateDraft(draft);
  }

  async save(input: SaveEnrichmentInput): Promise<CourseDraft> {
    const draftId = await this.database.transaction(async (transaction) => {
      const [existing] = await transaction
        .select({
          id: courseDrafts.id,
          baseReportVersion: courseDrafts.baseReportVersion,
          generationNumber: courseDrafts.generationNumber,
        })
        .from(courseDrafts)
        .innerJoin(dailyReports, eq(dailyReports.id, courseDrafts.reportId))
        .where(
          and(
            eq(courseDrafts.reportId, input.reportId),
            eq(dailyReports.studentId, input.studentId),
            isNull(dailyReports.deletedAt),
          ),
        )
        .orderBy(desc(courseDrafts.generationNumber))
        .limit(1);

      if (existing?.baseReportVersion === input.baseReportVersion) return existing.id;

      const generationNumber = existing ? existing.generationNumber + 1 : 1;
      const [created] = await transaction
        .insert(courseDrafts)
        .values({
          reportId: input.reportId,
          generationNumber,
          baseReportVersion: input.baseReportVersion,
          status: "needs_review",
          provider: input.result.provider,
          model: input.result.model,
          promptVersion: input.result.promptVersion,
          content: input.result.content,
          updatedAt: input.now,
        })
        .returning({ id: courseDrafts.id });
      if (!created) throw new Error("Unable to persist the generated course draft.");

      const correctionIds = new Map<number, string>();
      for (const [position, correction] of input.result.corrections.entries()) {
        const [storedCorrection] = await transaction
          .insert(draftCorrections)
          .values({
            draftId: created.id,
            position,
            originalExcerpt: correction.originalExcerpt,
            proposedText: correction.proposedText,
            explanation: correction.explanation,
          })
          .returning({ id: draftCorrections.id });
        if (!storedCorrection) throw new Error("Unable to persist a proposed correction.");
        correctionIds.set(position, storedCorrection.id);
      }

      for (const [position, citation] of input.result.citations.entries()) {
        const correctionPosition = input.result.corrections.findIndex((correction) =>
          correction.citationPositions.includes(position),
        );
        await transaction.insert(draftCitations).values({
          draftId: created.id,
          correctionId:
            correctionPosition >= 0 ? (correctionIds.get(correctionPosition) ?? null) : null,
          position,
          trustTier: citation.trustTier,
          title: citation.title,
          publisher: citation.publisher,
          url: citation.url,
          excerpt: citation.excerpt,
          retrievedAt: citation.retrievedAt,
        });
      }

      await transaction
        .update(dailyReports)
        .set({ enrichmentStatus: "needs_review", updatedAt: input.now })
        .where(
          and(eq(dailyReports.id, input.reportId), eq(dailyReports.studentId, input.studentId)),
        );
      return created.id;
    });

    const draft = await this.findLatestDraft(input.studentId, input.reportId);
    if (!draft || draft.id !== draftId)
      throw new Error("Unable to read the generated course draft.");
    return draft;
  }

  async markReportFailed(studentId: string, reportId: string, now: Date): Promise<void> {
    await this.database
      .update(dailyReports)
      .set({ enrichmentStatus: "failed", updatedAt: now })
      .where(and(eq(dailyReports.id, reportId), eq(dailyReports.studentId, studentId)));
  }

  async reviewCorrection(
    studentId: string,
    reportId: string,
    correctionId: string,
    status: Exclude<CorrectionReviewStatus, "proposed">,
    now: Date,
  ): Promise<boolean> {
    const [owned] = await this.database
      .select({ id: draftCorrections.id, draftStatus: courseDrafts.status })
      .from(draftCorrections)
      .innerJoin(courseDrafts, eq(courseDrafts.id, draftCorrections.draftId))
      .innerJoin(dailyReports, eq(dailyReports.id, courseDrafts.reportId))
      .where(
        and(
          eq(draftCorrections.id, correctionId),
          eq(courseDrafts.reportId, reportId),
          eq(dailyReports.studentId, studentId),
          isNull(dailyReports.deletedAt),
        ),
      )
      .limit(1);
    if (!owned || owned.draftStatus === "accepted") return false;

    await this.database
      .update(draftCorrections)
      .set({ reviewStatus: status, reviewedAt: now, updatedAt: now })
      .where(eq(draftCorrections.id, correctionId));
    return true;
  }

  async acceptLatestDraft(
    studentId: string,
    reportId: string,
    now: Date,
  ): Promise<AcceptDraftResult> {
    return this.database.transaction(async (transaction) => {
      const [draft] = await transaction
        .select({ id: courseDrafts.id, status: courseDrafts.status })
        .from(courseDrafts)
        .innerJoin(dailyReports, eq(dailyReports.id, courseDrafts.reportId))
        .where(
          and(
            eq(courseDrafts.reportId, reportId),
            eq(dailyReports.studentId, studentId),
            isNull(dailyReports.deletedAt),
          ),
        )
        .orderBy(desc(courseDrafts.generationNumber))
        .limit(1);
      if (!draft) return "not_found";
      if (draft.status === "accepted") return "accepted";

      const [pending] = await transaction
        .select({ id: draftCorrections.id })
        .from(draftCorrections)
        .where(
          and(
            eq(draftCorrections.draftId, draft.id),
            eq(draftCorrections.reviewStatus, "proposed"),
          ),
        )
        .limit(1);
      if (pending) return "pending_corrections";

      await transaction
        .update(courseDrafts)
        .set({ status: "accepted", acceptedAt: now, updatedAt: now })
        .where(eq(courseDrafts.id, draft.id));
      await transaction
        .update(dailyReports)
        .set({ enrichmentStatus: "accepted", updatedAt: now })
        .where(and(eq(dailyReports.id, reportId), eq(dailyReports.studentId, studentId)));
      return "accepted";
    });
  }

  private async hydrateDraft(draft: typeof courseDrafts.$inferSelect): Promise<CourseDraft> {
    const [correctionRows, citationRows] = await Promise.all([
      this.database
        .select({
          id: draftCorrections.id,
          position: draftCorrections.position,
          originalExcerpt: draftCorrections.originalExcerpt,
          proposedText: draftCorrections.proposedText,
          explanation: draftCorrections.explanation,
          reviewStatus: draftCorrections.reviewStatus,
          reviewedAt: draftCorrections.reviewedAt,
        })
        .from(draftCorrections)
        .where(eq(draftCorrections.draftId, draft.id))
        .orderBy(draftCorrections.position),
      this.database
        .select({
          id: draftCitations.id,
          correctionId: draftCitations.correctionId,
          position: draftCitations.position,
          trustTier: draftCitations.trustTier,
          title: draftCitations.title,
          publisher: draftCitations.publisher,
          url: draftCitations.url,
          excerpt: draftCitations.excerpt,
          retrievedAt: draftCitations.retrievedAt,
        })
        .from(draftCitations)
        .where(eq(draftCitations.draftId, draft.id))
        .orderBy(draftCitations.position),
    ]);

    const citations: DraftCitation[] = citationRows.map((citation) => ({
      ...citation,
      retrievedAt: citation.retrievedAt.toISOString(),
    }));
    return {
      id: draft.id,
      reportId: draft.reportId,
      generationNumber: draft.generationNumber,
      baseReportVersion: draft.baseReportVersion,
      status: draft.status,
      provider: draft.provider,
      model: draft.model,
      promptVersion: draft.promptVersion,
      content: draft.content ?? null,
      failureCode: draft.failureCode,
      corrections: correctionRows.map((correction) => ({
        ...correction,
        reviewedAt: correction.reviewedAt?.toISOString() ?? null,
        citations: citations.filter((citation) => citation.correctionId === correction.id),
      })),
      citations,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
      acceptedAt: draft.acceptedAt?.toISOString() ?? null,
    };
  }
}
