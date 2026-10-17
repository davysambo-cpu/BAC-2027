import type { GeneratedCourseContent, SourceTrustTier } from "@bac-2027/contracts";

export interface EnrichmentReportInput {
  report: {
    id: string;
    version: number;
    title: string;
    originalSummary: string;
    understoodPoints: string | null;
    questions: string | null;
  };
  subjectName: string;
  catalogueItem: {
    title: string;
    section: string;
    url: string | null;
    validationStatus:
      "owner_provided" | "pedagogically_validated" | "institutionally_validated" | "excluded";
  } | null;
  catalogueSource: {
    title: string;
    publisher: string | null;
    url: string | null;
    validationStatus:
      "owner_provided" | "pedagogically_validated" | "institutionally_validated" | "excluded";
  } | null;
}

export interface GeneratedCitationInput {
  trustTier: SourceTrustTier;
  title: string;
  publisher: string | null;
  url: string | null;
  excerpt: string | null;
  retrievedAt: Date;
}

export interface GeneratedCorrectionInput {
  originalExcerpt: string;
  proposedText: string;
  explanation: string;
  citationPositions: number[];
}

export interface EnrichmentResult {
  provider: string;
  model: string;
  promptVersion: string;
  content: GeneratedCourseContent;
  corrections: GeneratedCorrectionInput[];
  citations: GeneratedCitationInput[];
}

export interface EnrichmentProvider {
  generate(input: EnrichmentReportInput): Promise<EnrichmentResult>;
}

function splitPoints(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/\n+|(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 12);
}

type ValidationStatus =
  "owner_provided" | "pedagogically_validated" | "institutionally_validated" | "excluded";

function trustTier(sourceStatus: ValidationStatus, itemStatus: ValidationStatus): SourceTrustTier {
  if (sourceStatus === "institutionally_validated" && itemStatus === "institutionally_validated") {
    return "institutional";
  }
  if (
    ["pedagogically_validated", "institutionally_validated"].includes(sourceStatus) &&
    ["pedagogically_validated", "institutionally_validated"].includes(itemStatus)
  ) {
    return "curated";
  }
  return "catalogue";
}

/**
 * Fournisseur local gratuit : il organise uniquement les données déjà présentes.
 * Il ne prétend ni vérifier les faits, ni inventer des explications ou corrections.
 */
export class LocalOutlineEnrichmentProvider implements EnrichmentProvider {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async generate(input: EnrichmentReportInput): Promise<EnrichmentResult> {
    const understoodPoints = splitPoints(input.report.understoodPoints);
    const studentQuestions = splitPoints(input.report.questions);
    const linkedTheme = input.catalogueItem?.title;

    const citations: GeneratedCitationInput[] = [];
    if (input.catalogueSource && input.catalogueItem) {
      citations.push({
        trustTier: trustTier(
          input.catalogueSource.validationStatus,
          input.catalogueItem.validationStatus,
        ),
        title: input.catalogueSource.title,
        publisher: input.catalogueSource.publisher,
        url: input.catalogueItem.url ?? input.catalogueSource.url,
        excerpt: `Le thème « ${input.catalogueItem.title} » figure dans la section ${input.catalogueItem.section} du catalogue fourni. Cette référence établit le rattachement du thème, pas l'exactitude factuelle du bilan.`,
        retrievedAt: this.now(),
      });
    }

    return {
      provider: "local-outline",
      model: "deterministic-v1",
      promptVersion: "daily-report-outline-v1",
      content: {
        objectives: [
          `Organiser les notes du cours « ${input.report.title} » en ${input.subjectName}.`,
          linkedTheme
            ? `Relier le bilan au thème de travail « ${linkedTheme} » sans modifier le texte original.`
            : "Identifier le thème précis à rattacher au catalogue de travail.",
          "Distinguer les éléments compris, les questions et les informations qui restent à vérifier.",
        ],
        synthesis: input.report.originalSummary,
        definitions: [],
        explanations: understoodPoints.map(
          (point) => `Point déclaré comme compris par l'élève : ${point}`,
        ),
        examples: [],
        unresolvedPoints: [
          ...studentQuestions.map((question) => `Question de l'élève : ${question}`),
          "La vérification factuelle et l'ajout d'explications externes n'ont pas encore été exécutés : le fournisseur local se limite à structurer le bilan.",
          ...(citations.length === 0
            ? ["Aucune source de catalogue n'est rattachée à ce bilan."]
            : []),
        ],
      },
      corrections: [],
      citations,
    };
  }
}
