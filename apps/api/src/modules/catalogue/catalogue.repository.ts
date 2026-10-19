import { and, asc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";

import type {
  CatalogueBulkConfirmationResult,
  CatalogueItem,
  CatalogueSeriesDecision,
  CatalogueSubject,
  CatalogueValidationResult,
  ConfirmCatalogueItemsRequest,
  ContentValidationStatus,
  SeriesScopeStatus,
  UpdateCatalogueItemValidationRequest,
} from "@bac-2027/contracts";

import type { AppDatabase } from "../../db/client";
import {
  academicSeries,
  adminAuditLogs,
  catalogueItems,
  curriculumSources,
  seriesSubjects,
  subjects,
} from "../../db/schema";

export interface SeriesCatalogueRecord {
  series: { code: string; name: string };
  subjects: CatalogueSubject[];
}

export type CatalogueValidationMutationResult =
  "not_found" | "version_conflict" | CatalogueValidationResult;

export interface CatalogueRepository {
  findStudentCatalogue(seriesCode: string): Promise<SeriesCatalogueRecord | null>;
  findAdminCatalogue(seriesCode: string): Promise<SeriesCatalogueRecord | null>;
  updateItemValidation(
    actorId: string,
    itemId: string,
    input: UpdateCatalogueItemValidationRequest,
    now: Date,
    requestId?: string,
  ): Promise<CatalogueValidationMutationResult>;
  confirmVisibleItems(
    actorId: string,
    seriesCode: string,
    input: ConfirmCatalogueItemsRequest,
    now: Date,
    requestId?: string,
  ): Promise<CatalogueBulkConfirmationResult>;
}

const effectiveSeriesScope = sql<SeriesScopeStatus>`coalesce(${catalogueItems.adminSeriesDScope}, ${catalogueItems.seriesDScope})`;

const studentVisibleScope = or(
  eq(catalogueItems.adminSeriesDScope, "explicitly_includes"),
  and(
    isNull(catalogueItems.adminSeriesDScope),
    ne(catalogueItems.seriesDScope, "explicitly_excludes"),
  ),
);

export class DrizzleCatalogueRepository implements CatalogueRepository {
  constructor(private readonly database: AppDatabase) {}

  async findStudentCatalogue(seriesCode: string): Promise<SeriesCatalogueRecord | null> {
    return this.findCatalogue(seriesCode, false);
  }

  async findAdminCatalogue(seriesCode: string): Promise<SeriesCatalogueRecord | null> {
    return this.findCatalogue(seriesCode, true);
  }

  async updateItemValidation(
    actorId: string,
    itemId: string,
    input: UpdateCatalogueItemValidationRequest,
    now: Date,
    requestId?: string,
  ): Promise<CatalogueValidationMutationResult> {
    return this.database.transaction(async (transaction) => {
      const [current] = await transaction
        .select({
          id: catalogueItems.id,
          sourceSeriesDScope: catalogueItems.seriesDScope,
          adminSeriesDScope: catalogueItems.adminSeriesDScope,
          validationStatus: catalogueItems.validationStatus,
          validationVersion: catalogueItems.validationVersion,
        })
        .from(catalogueItems)
        .where(and(eq(catalogueItems.id, itemId), eq(catalogueItems.isActive, true)))
        .limit(1);
      if (!current) return "not_found";
      if (current.validationVersion !== input.version) return "version_conflict";

      const next = validationFields(input.decision, input.validationLevel);
      const [updated] = await transaction
        .update(catalogueItems)
        .set({
          adminSeriesDScope: next.adminSeriesDScope,
          validationStatus: next.validationStatus,
          validationNote: input.justification,
          validationSourceUrl: input.sourceUrl,
          validatedBy: actorId,
          validatedAt: now,
          validationVersion: input.version + 1,
          updatedAt: now,
        })
        .where(
          and(
            eq(catalogueItems.id, itemId),
            eq(catalogueItems.validationVersion, input.version),
            eq(catalogueItems.isActive, true),
          ),
        )
        .returning({ version: catalogueItems.validationVersion });
      if (!updated) return "version_conflict";

      await transaction.insert(adminAuditLogs).values({
        actorId,
        action: "catalogue.validation.updated",
        targetType: "catalogue_item",
        targetId: itemId,
        requestId,
        metadata: {
          decision: input.decision,
          validationLevel: input.validationLevel,
          justification: input.justification,
          sourceUrl: input.sourceUrl,
          previous: {
            sourceSeriesDScope: current.sourceSeriesDScope,
            adminSeriesDScope: current.adminSeriesDScope,
            validationStatus: current.validationStatus,
            version: current.validationVersion,
          },
        },
      });

      return {
        itemId,
        decision: input.decision,
        validationStatus: next.validationStatus,
        version: updated.version,
        validatedAt: now.toISOString(),
      };
    });
  }

  async confirmVisibleItems(
    actorId: string,
    seriesCode: string,
    input: ConfirmCatalogueItemsRequest,
    now: Date,
    requestId?: string,
  ): Promise<CatalogueBulkConfirmationResult> {
    return this.database.transaction(async (transaction) => {
      const [series] = await transaction
        .select({ id: academicSeries.id })
        .from(academicSeries)
        .where(and(eq(academicSeries.code, seriesCode), eq(academicSeries.isActive, true)))
        .limit(1);
      if (!series) {
        return { updatedItems: 0, updatedSubjects: 0, validatedAt: now.toISOString() };
      }

      const candidates = await transaction
        .select({ id: catalogueItems.id, subjectId: catalogueItems.subjectId })
        .from(catalogueItems)
        .innerJoin(
          seriesSubjects,
          and(
            eq(seriesSubjects.seriesId, series.id),
            eq(seriesSubjects.subjectId, catalogueItems.subjectId),
          ),
        )
        .where(
          and(
            eq(catalogueItems.isActive, true),
            eq(seriesSubjects.isActive, true),
            isNull(catalogueItems.adminSeriesDScope),
            ne(catalogueItems.seriesDScope, "explicitly_excludes"),
            ne(catalogueItems.validationStatus, "excluded"),
            input.subjectId ? eq(catalogueItems.subjectId, input.subjectId) : undefined,
          ),
        );

      if (candidates.length === 0) {
        return { updatedItems: 0, updatedSubjects: 0, validatedAt: now.toISOString() };
      }

      const itemIds = candidates.map((item) => item.id);
      const subjectIds = [...new Set(candidates.map((item) => item.subjectId))];
      const updatedItems = await transaction
        .update(catalogueItems)
        .set({
          adminSeriesDScope: "explicitly_includes",
          validationStatus: input.validationLevel,
          validationNote: input.justification,
          validationSourceUrl: input.sourceUrl,
          validatedBy: actorId,
          validatedAt: now,
          validationVersion: sql`${catalogueItems.validationVersion} + 1`,
          updatedAt: now,
        })
        .where(inArray(catalogueItems.id, itemIds))
        .returning({ id: catalogueItems.id });

      const updatedSubjects = await transaction
        .update(seriesSubjects)
        .set({ validationStatus: input.validationLevel, updatedAt: now })
        .where(
          and(
            eq(seriesSubjects.seriesId, series.id),
            inArray(seriesSubjects.subjectId, subjectIds),
          ),
        )
        .returning({ subjectId: seriesSubjects.subjectId });

      await transaction.insert(adminAuditLogs).values({
        actorId,
        action: "catalogue.validation.bulk_confirmed",
        targetType: input.subjectId ? "subject_catalogue" : "series_catalogue",
        targetId: input.subjectId,
        requestId,
        metadata: {
          seriesCode,
          validationLevel: input.validationLevel,
          justification: input.justification,
          sourceUrl: input.sourceUrl,
          updatedItems: updatedItems.length,
          updatedSubjects: updatedSubjects.length,
        },
      });

      return {
        updatedItems: updatedItems.length,
        updatedSubjects: updatedSubjects.length,
        validatedAt: now.toISOString(),
      };
    });
  }

  private async findCatalogue(
    seriesCode: string,
    includeHiddenEntries: boolean,
  ): Promise<SeriesCatalogueRecord | null> {
    const [series] = await this.database
      .select({ id: academicSeries.id, code: academicSeries.code, name: academicSeries.name })
      .from(academicSeries)
      .where(and(eq(academicSeries.code, seriesCode), eq(academicSeries.isActive, true)))
      .limit(1);
    if (!series) return null;

    const subjectRows = await this.database
      .select({
        id: subjects.id,
        code: subjects.code,
        name: subjects.name,
        position: seriesSubjects.position,
        validationStatus: seriesSubjects.validationStatus,
      })
      .from(seriesSubjects)
      .innerJoin(subjects, eq(subjects.id, seriesSubjects.subjectId))
      .where(
        and(
          eq(seriesSubjects.seriesId, series.id),
          eq(seriesSubjects.isActive, true),
          eq(subjects.isActive, true),
          includeHiddenEntries ? undefined : ne(seriesSubjects.validationStatus, "excluded"),
        ),
      )
      .orderBy(asc(seriesSubjects.position), asc(subjects.name));

    if (subjectRows.length === 0) {
      return { series: { code: series.code, name: series.name }, subjects: [] };
    }

    const itemRows = await this.database
      .select({
        id: catalogueItems.id,
        code: catalogueItems.code,
        subjectId: catalogueItems.subjectId,
        title: catalogueItems.title,
        section: catalogueItems.sourceSection,
        position: catalogueItems.subjectPosition,
        sourceUrl: catalogueItems.sourceUrl,
        seriesMention: catalogueItems.seriesMention,
        seriesLabels: catalogueItems.seriesLabels,
        effectiveSeriesDScope: effectiveSeriesScope,
        sourceSeriesDScope: catalogueItems.seriesDScope,
        adminSeriesDDecision: catalogueItems.adminSeriesDScope,
        validationStatus: catalogueItems.validationStatus,
        validationNote: catalogueItems.validationNote,
        validationSourceUrl: catalogueItems.validationSourceUrl,
        validatedAt: catalogueItems.validatedAt,
        validationVersion: catalogueItems.validationVersion,
        sourceTitle: curriculumSources.title,
        sourcePublisher: curriculumSources.publisherLabel,
        sourceValidationStatus: curriculumSources.validationStatus,
      })
      .from(catalogueItems)
      .innerJoin(curriculumSources, eq(curriculumSources.id, catalogueItems.sourceId))
      .where(
        and(
          inArray(
            catalogueItems.subjectId,
            subjectRows.map((subject) => subject.id),
          ),
          eq(catalogueItems.isActive, true),
          includeHiddenEntries ? undefined : studentVisibleScope,
          includeHiddenEntries ? undefined : ne(catalogueItems.validationStatus, "excluded"),
        ),
      )
      .orderBy(asc(catalogueItems.subjectId), asc(catalogueItems.subjectPosition));

    const itemsBySubject = new Map<string, CatalogueItem[]>();
    for (const row of itemRows) {
      const item: CatalogueItem = {
        id: row.id,
        code: row.code,
        title: row.title,
        section: row.section,
        position: row.position,
        sourceUrl: row.sourceUrl,
        seriesMention: row.seriesMention,
        seriesLabels: row.seriesLabels,
        seriesDScope: row.effectiveSeriesDScope,
        sourceSeriesDScope: row.sourceSeriesDScope,
        adminSeriesDDecision:
          row.adminSeriesDDecision === "explicitly_includes" ||
          row.adminSeriesDDecision === "explicitly_excludes"
            ? row.adminSeriesDDecision
            : null,
        validationStatus: row.validationStatus,
        validationNote: row.validationNote,
        validationSourceUrl: row.validationSourceUrl,
        validatedAt: row.validatedAt?.toISOString() ?? null,
        validationVersion: row.validationVersion,
        source: {
          title: row.sourceTitle,
          publisher: row.sourcePublisher,
          validationStatus: row.sourceValidationStatus,
        },
      };
      const existing = itemsBySubject.get(row.subjectId) ?? [];
      existing.push(item);
      itemsBySubject.set(row.subjectId, existing);
    }

    return {
      series: { code: series.code, name: series.name },
      subjects: subjectRows.map((subject) => ({
        id: subject.id,
        code: subject.code,
        name: subject.name,
        position: subject.position,
        validationStatus: subject.validationStatus as ContentValidationStatus,
        items: itemsBySubject.get(subject.id) ?? [],
      })),
    };
  }
}

function validationFields(
  decision: CatalogueSeriesDecision,
  level: UpdateCatalogueItemValidationRequest["validationLevel"],
): {
  adminSeriesDScope: "explicitly_includes" | "explicitly_excludes" | null;
  validationStatus: ContentValidationStatus;
} {
  if (decision === "confirmed") {
    return {
      adminSeriesDScope: "explicitly_includes",
      validationStatus: level ?? "pedagogically_validated",
    };
  }
  if (decision === "excluded") {
    return { adminSeriesDScope: "explicitly_excludes", validationStatus: "excluded" };
  }
  return { adminSeriesDScope: null, validationStatus: "owner_provided" };
}
