import { and, asc, eq, inArray, ne } from "drizzle-orm";

import type { CatalogueItem, CatalogueSubject, ContentValidationStatus } from "@bac-2027/contracts";

import type { AppDatabase } from "../../db/client";
import {
  academicSeries,
  catalogueItems,
  curriculumSources,
  seriesSubjects,
  subjects,
} from "../../db/schema";

export interface SeriesCatalogueRecord {
  series: { code: string; name: string };
  subjects: CatalogueSubject[];
}

export interface CatalogueRepository {
  findStudentCatalogue(seriesCode: string): Promise<SeriesCatalogueRecord | null>;
  findAdminCatalogue(seriesCode: string): Promise<SeriesCatalogueRecord | null>;
}

export class DrizzleCatalogueRepository implements CatalogueRepository {
  constructor(private readonly database: AppDatabase) {}

  async findStudentCatalogue(seriesCode: string): Promise<SeriesCatalogueRecord | null> {
    return this.findCatalogue(seriesCode, false);
  }

  async findAdminCatalogue(seriesCode: string): Promise<SeriesCatalogueRecord | null> {
    return this.findCatalogue(seriesCode, true);
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
        seriesDScope: catalogueItems.seriesDScope,
        validationStatus: catalogueItems.validationStatus,
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
          includeHiddenEntries ? undefined : ne(catalogueItems.seriesDScope, "explicitly_excludes"),
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
        seriesDScope: row.seriesDScope,
        validationStatus: row.validationStatus,
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
