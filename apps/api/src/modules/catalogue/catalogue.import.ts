import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { eq } from "drizzle-orm";
import { z } from "zod";

import type { AppDatabase } from "../../db/client";
import {
  academicSeries,
  catalogueItems,
  curriculumSources,
  seriesSubjects,
  subjects,
} from "../../db/schema";

const manifestItemSchema = z.object({
  position: z.number().int().positive(),
  title: z.string().min(1),
  sourceUrl: z.string().url(),
});

const manifestDocumentSchema = z.object({
  fileName: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  pdfPages: z.number().int().positive(),
  pdfTitle: z.string().min(1),
  printCreationDate: z.string().min(1),
  sourcePage: z.string().url(),
  catalogueSection: z.enum([
    "ANGLAIS",
    "CHIMIE",
    "FRANCAIS",
    "GEOGRAPHIE",
    "HISTOIRE",
    "MATHEMATIQUES",
    "PHILOSOPHIE",
    "PHYSIQUE",
    "SVT",
  ]),
  itemCount: z.number().int().nonnegative(),
  items: z.array(manifestItemSchema),
});

const catalogueManifestSchema = z.object({
  receivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  classification: z.literal("reference_catalogue_non_normatif"),
  portal: z.string().url(),
  notice: z.string().min(1),
  documents: z.array(manifestDocumentSchema).length(9),
});

type CatalogueManifest = z.infer<typeof catalogueManifestSchema>;
type CatalogueSection = CatalogueManifest["documents"][number]["catalogueSection"];

interface SectionConfiguration {
  subjectCode: string;
  subjectName: string;
  subjectPosition: number;
  sectionLabel: string;
  sectionOffset: number;
}

const sectionConfigurations: Record<CatalogueSection, SectionConfiguration> = {
  FRANCAIS: {
    subjectCode: "FRANCAIS",
    subjectName: "Français",
    subjectPosition: 10,
    sectionLabel: "Français",
    sectionOffset: 0,
  },
  ANGLAIS: {
    subjectCode: "ANGLAIS",
    subjectName: "Anglais",
    subjectPosition: 20,
    sectionLabel: "Anglais",
    sectionOffset: 0,
  },
  MATHEMATIQUES: {
    subjectCode: "MATHEMATIQUES",
    subjectName: "Mathématiques",
    subjectPosition: 30,
    sectionLabel: "Mathématiques",
    sectionOffset: 0,
  },
  PHILOSOPHIE: {
    subjectCode: "PHILOSOPHIE",
    subjectName: "Philosophie",
    subjectPosition: 40,
    sectionLabel: "Philosophie",
    sectionOffset: 0,
  },
  HISTOIRE: {
    subjectCode: "HISTOIRE-GEOGRAPHIE",
    subjectName: "Histoire-géographie",
    subjectPosition: 50,
    sectionLabel: "Histoire",
    sectionOffset: 0,
  },
  GEOGRAPHIE: {
    subjectCode: "HISTOIRE-GEOGRAPHIE",
    subjectName: "Histoire-géographie",
    subjectPosition: 50,
    sectionLabel: "Géographie",
    sectionOffset: 1_000,
  },
  PHYSIQUE: {
    subjectCode: "SCIENCES-PHYSIQUES",
    subjectName: "Sciences physiques",
    subjectPosition: 60,
    sectionLabel: "Physique",
    sectionOffset: 0,
  },
  CHIMIE: {
    subjectCode: "SCIENCES-PHYSIQUES",
    subjectName: "Sciences physiques",
    subjectPosition: 60,
    sectionLabel: "Chimie",
    sectionOffset: 1_000,
  },
  SVT: {
    subjectCode: "SVT",
    subjectName: "Sciences de la vie et de la Terre",
    subjectPosition: 70,
    sectionLabel: "SVT",
    sectionOffset: 0,
  },
};

export interface CatalogueImportSummary {
  series: number;
  subjects: number;
  sources: number;
  items: number;
  studentVisibleItems: number;
  hiddenOtherSeriesItems: number;
}

function findDefaultManifestPath(): string {
  const candidates = [
    resolve(process.cwd(), "docs/sources/catalogue-fasoeducation-2026-10-15.json"),
    resolve(process.cwd(), "../../docs/sources/catalogue-fasoeducation-2026-10-15.json"),
    fileURLToPath(
      new URL(
        "../../../../../docs/sources/catalogue-fasoeducation-2026-10-15.json",
        import.meta.url,
      ),
    ),
  ];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) throw new Error("Unable to locate the initial Faso e-education catalogue manifest.");
  return path;
}

export async function readInitialCatalogueManifest(
  path = findDefaultManifestPath(),
): Promise<CatalogueManifest> {
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  const manifest = catalogueManifestSchema.parse(parsed);
  for (const document of manifest.documents) {
    if (document.itemCount !== document.items.length) {
      throw new Error(`Item count mismatch in ${document.fileName}.`);
    }
  }
  return manifest;
}

function parsePdfDate(value: string): Date {
  const match = /^D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})([+-])(\d{2})'?(\d{2})'?/.exec(value);
  if (!match) throw new Error(`Unsupported PDF date: ${value}`);
  const [, year, month, day, hour, minute, second, sign, offsetHour, offsetMinute] = match;
  return new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offsetHour}:${offsetMinute}`,
  );
}

function seriesScope(title: string): {
  mention: string | null;
  labels: string[];
  status: "explicitly_includes" | "unspecified" | "explicitly_excludes";
} {
  const match = /\((terminales?\s+([^)]+))\)/i.exec(title);
  if (!match) return { mention: null, labels: [], status: "unspecified" };
  const mention = match[1] ?? null;
  const labels = [...new Set((match[2]?.toUpperCase().match(/[A-E]/g) ?? []).filter(Boolean))];
  return {
    mention,
    labels,
    status: labels.includes("D") ? "explicitly_includes" : "explicitly_excludes",
  };
}

function sourceCode(section: CatalogueSection, checksum: string): string {
  return `FASOEDU-${section}-${checksum.slice(0, 12).toUpperCase()}`;
}

export async function importInitialCatalogue(
  database: AppDatabase,
  manifest?: CatalogueManifest,
): Promise<CatalogueImportSummary> {
  const data = manifest ?? (await readInitialCatalogueManifest());
  const now = new Date();
  const receivedAt = new Date(`${data.receivedAt}T00:00:00.000Z`);

  await database.transaction(async (transaction) => {
    const [series] = await transaction
      .insert(academicSeries)
      .values({
        code: "D",
        name: "Série D",
        countryCode: "BF",
        educationLevel: "terminale",
      })
      .onConflictDoUpdate({
        target: academicSeries.code,
        set: {
          name: "Série D",
          countryCode: "BF",
          educationLevel: "terminale",
          isActive: true,
          updatedAt: now,
        },
      })
      .returning({ id: academicSeries.id });
    if (!series) throw new Error("Unable to create or update Série D.");

    const uniqueSubjectConfigurations = [
      ...new Map(
        Object.values(sectionConfigurations).map((configuration) => [
          configuration.subjectCode,
          configuration,
        ]),
      ).values(),
    ];

    const subjectIds = new Map<string, string>();
    for (const configuration of uniqueSubjectConfigurations) {
      const [subject] = await transaction
        .insert(subjects)
        .values({
          code: configuration.subjectCode,
          name: configuration.subjectName,
          position: configuration.subjectPosition,
          isOfficial: false,
          sourceReference:
            "Catalogue pédagogique fourni par le porteur — validation institutionnelle en attente",
        })
        .onConflictDoUpdate({
          target: subjects.code,
          set: {
            name: configuration.subjectName,
            position: configuration.subjectPosition,
            sourceReference:
              "Catalogue pédagogique fourni par le porteur — validation institutionnelle en attente",
            isActive: true,
            updatedAt: now,
          },
        })
        .returning({ id: subjects.id });
      if (!subject) throw new Error(`Unable to create subject ${configuration.subjectCode}.`);
      subjectIds.set(configuration.subjectCode, subject.id);

      await transaction
        .insert(seriesSubjects)
        .values({
          seriesId: series.id,
          subjectId: subject.id,
          position: configuration.subjectPosition,
          validationStatus: "owner_provided",
          sourceReference:
            "Neuf catalogues Faso e-education reçus le 16 octobre 2026 et approuvés comme base de travail",
        })
        .onConflictDoUpdate({
          target: [seriesSubjects.seriesId, seriesSubjects.subjectId],
          set: {
            position: configuration.subjectPosition,
            sourceReference:
              "Neuf catalogues Faso e-education reçus le 16 octobre 2026 et approuvés comme base de travail",
            isActive: true,
            updatedAt: now,
          },
        });
    }

    for (const document of data.documents) {
      const configuration = sectionConfigurations[document.catalogueSection];
      const subjectId = subjectIds.get(configuration.subjectCode);
      if (!subjectId) throw new Error(`Missing subject ${configuration.subjectCode}.`);
      const code = sourceCode(document.catalogueSection, document.sha256);
      const [source] = await transaction
        .insert(curriculumSources)
        .values({
          code,
          title: document.pdfTitle,
          kind: "pedagogical_catalogue",
          validationStatus: "owner_provided",
          publisherLabel: "Faso e-education",
          originalFileName: document.fileName,
          checksumSha256: document.sha256,
          pageCount: document.pdfPages,
          sourceUrl: document.sourcePage,
          capturedAt: parsePdfDate(document.printCreationDate),
          receivedAt,
          notes:
            "Impression d'un catalogue de cours ; source pédagogique de travail, non assimilée à un acte administratif.",
          metadata: {
            portal: data.portal,
            classification: data.classification,
            catalogueSection: document.catalogueSection,
          },
        })
        .onConflictDoUpdate({
          target: curriculumSources.code,
          set: {
            title: document.pdfTitle,
            publisherLabel: "Faso e-education",
            originalFileName: document.fileName,
            checksumSha256: document.sha256,
            pageCount: document.pdfPages,
            sourceUrl: document.sourcePage,
            capturedAt: parsePdfDate(document.printCreationDate),
            receivedAt,
            metadata: {
              portal: data.portal,
              classification: data.classification,
              catalogueSection: document.catalogueSection,
            },
            updatedAt: now,
          },
        })
        .returning({ id: curriculumSources.id });
      if (!source) throw new Error(`Unable to create source ${code}.`);

      await transaction
        .update(catalogueItems)
        .set({ isActive: false, updatedAt: now })
        .where(eq(catalogueItems.sourceId, source.id));

      for (const item of document.items) {
        const scope = seriesScope(item.title);
        await transaction
          .insert(catalogueItems)
          .values({
            code: `${code}-${String(item.position).padStart(3, "0")}`,
            subjectId,
            sourceId: source.id,
            sourceSection: configuration.sectionLabel,
            sourcePosition: item.position,
            subjectPosition: configuration.sectionOffset + item.position,
            title: item.title,
            sourceUrl: item.sourceUrl,
            seriesMention: scope.mention,
            seriesLabels: scope.labels,
            seriesDScope: scope.status,
            validationStatus: "owner_provided",
          })
          .onConflictDoUpdate({
            target: [catalogueItems.sourceId, catalogueItems.sourcePosition],
            set: {
              subjectId,
              sourceSection: configuration.sectionLabel,
              subjectPosition: configuration.sectionOffset + item.position,
              title: item.title,
              sourceUrl: item.sourceUrl,
              seriesMention: scope.mention,
              seriesLabels: scope.labels,
              seriesDScope: scope.status,
              isActive: true,
              updatedAt: now,
            },
          });
      }
    }
  });

  const allItems = data.documents.flatMap((document) => document.items);
  const hiddenOtherSeriesItems = allItems.filter(
    (item) => seriesScope(item.title).status === "explicitly_excludes",
  ).length;
  return {
    series: 1,
    subjects: new Set(
      data.documents.map(
        (document) => sectionConfigurations[document.catalogueSection].subjectCode,
      ),
    ).size,
    sources: data.documents.length,
    items: allItems.length,
    studentVisibleItems: allItems.length - hiddenOtherSeriesItems,
    hiddenOtherSeriesItems,
  };
}
