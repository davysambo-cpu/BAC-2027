import type {
  EnrichmentProvider,
  EnrichmentReportInput,
  EnrichmentResult,
} from "../daily-reports/enrichment.provider";
import type { KnowledgeRepository } from "./knowledge.repository";

function splitPoints(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/\n+|(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function exactTriggeredExcerpt(original: string, trigger: string): string | null {
  const position = original.toLocaleLowerCase("fr").indexOf(trigger.toLocaleLowerCase("fr"));
  return position < 0 ? null : original.slice(position, position + trigger.length);
}

/**
 * Utilise uniquement les fiches publiées par l'administration. En l'absence de
 * fiche approuvée, le fournisseur local transparent reste le repli.
 */
export class CuratedCorpusEnrichmentProvider implements EnrichmentProvider {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly fallback: EnrichmentProvider,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async generate(input: EnrichmentReportInput): Promise<EnrichmentResult> {
    if (!input.catalogueItem) return this.fallback.generate(input);
    const card = await this.repository.findPublishedForCatalogueItem(input.catalogueItem.id);
    if (!card) return this.fallback.generate(input);

    const corrections = card.correctionRules.flatMap((rule) => {
      const originalExcerpt = exactTriggeredExcerpt(input.report.originalSummary, rule.trigger);
      return originalExcerpt
        ? [
            {
              originalExcerpt,
              proposedText: rule.proposedText,
              explanation: rule.explanation,
              citationPositions: [0],
            },
          ]
        : [];
    });
    const studentQuestions = splitPoints(input.report.questions);

    return {
      provider: "curated-corpus",
      model: `literal-retrieval-v1-card-${card.version}`,
      promptVersion: "knowledge-card-v1",
      content: {
        ...card.content,
        unresolvedPoints: [
          ...studentQuestions.map((question) => `Question de l'élève : ${question}`),
          "La détection automatique compare uniquement les expressions explicitement prévues dans la fiche approuvée ; les autres formulations doivent être relues par l'élève ou le professeur.",
        ],
      },
      corrections,
      citations: [
        {
          trustTier: card.trustTier,
          title: card.sourceTitle,
          publisher: card.sourcePublisher,
          url: card.sourceUrl,
          excerpt: card.sourceExcerpt,
          retrievedAt: this.now(),
        },
      ],
    };
  }
}
