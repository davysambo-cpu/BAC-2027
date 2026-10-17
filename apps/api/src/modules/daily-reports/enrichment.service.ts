import { z } from "zod";

import {
  citedSourceUrlSchema,
  generatedCourseContentSchema,
  sourceTrustTierSchema,
  type CourseDraft,
  type CurrentUser,
  type ReviewDraftCorrectionRequest,
} from "@bac-2027/contracts";

import { ApplicationError } from "../../lib/errors";
import type { EnrichmentProvider, EnrichmentResult } from "./enrichment.provider";
import type { EnrichmentRepository } from "./enrichment.repository";

const providerResultSchema = z.object({
  provider: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(160),
  promptVersion: z.string().trim().min(1).max(80),
  content: generatedCourseContentSchema,
  corrections: z
    .array(
      z.object({
        originalExcerpt: z.string().trim().min(1).max(10_000),
        proposedText: z.string().trim().min(1).max(10_000),
        explanation: z.string().trim().min(1).max(10_000),
        citationPositions: z.array(z.number().int().nonnegative()).min(1).max(10),
      }),
    )
    .max(30),
  citations: z
    .array(
      z.object({
        trustTier: sourceTrustTierSchema,
        title: z.string().trim().min(1).max(300),
        publisher: z.string().trim().min(1).max(200).nullable(),
        url: citedSourceUrlSchema.nullable(),
        excerpt: z.string().trim().max(4_000).nullable(),
        retrievedAt: z.date(),
      }),
    )
    .max(60),
});

export class EnrichmentService {
  constructor(
    private readonly repository: EnrichmentRepository,
    private readonly provider: EnrichmentProvider,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async generate(user: CurrentUser, reportId: string, force = false): Promise<CourseDraft> {
    this.requireStudent(user);
    const input = await this.repository.findReportInput(user.id, reportId);
    if (!input) throw this.reportNotFound();

    const existing = await this.repository.findLatestDraft(user.id, reportId);
    if (
      !force &&
      existing &&
      existing.baseReportVersion === input.report.version &&
      !existing.failureCode
    ) {
      return existing;
    }

    try {
      const result = providerResultSchema.parse(await this.provider.generate(input));
      this.validateCorrections(input.report.originalSummary, result);
      if (
        force &&
        existing &&
        existing.baseReportVersion === input.report.version &&
        existing.provider === result.provider &&
        existing.model === result.model &&
        existing.promptVersion === result.promptVersion &&
        !existing.failureCode
      ) {
        return existing;
      }
      return await this.repository.save({
        reportId,
        studentId: user.id,
        baseReportVersion: input.report.version,
        result,
        forceNewGeneration: force,
        now: this.now(),
      });
    } catch (error) {
      await this.repository.markReportFailed(user.id, reportId, this.now());
      throw new ApplicationError(
        "ENRICHMENT_FAILED",
        "Le brouillon n'a pas pu être préparé. Votre bilan original reste intact.",
        503,
        { cause: error instanceof z.ZodError ? "invalid_provider_response" : "provider_failure" },
      );
    }
  }

  async latest(user: CurrentUser, reportId: string): Promise<CourseDraft> {
    this.requireStudent(user);
    const draft = await this.repository.findLatestDraft(user.id, reportId);
    if (!draft) {
      throw new ApplicationError(
        "NOT_FOUND",
        "Aucun brouillon structuré n'existe encore pour ce bilan.",
        404,
      );
    }
    return draft;
  }

  async reviewCorrection(
    user: CurrentUser,
    reportId: string,
    correctionId: string,
    input: ReviewDraftCorrectionRequest,
  ): Promise<CourseDraft> {
    this.requireStudent(user);
    const updated = await this.repository.reviewCorrection(
      user.id,
      reportId,
      correctionId,
      input.reviewStatus,
      this.now(),
    );
    if (!updated) {
      throw new ApplicationError(
        "NOT_FOUND",
        "Cette correction est introuvable ou le cours a déjà été validé.",
        404,
      );
    }
    return this.latest(user, reportId);
  }

  async accept(user: CurrentUser, reportId: string): Promise<CourseDraft> {
    this.requireStudent(user);
    const result = await this.repository.acceptLatestDraft(user.id, reportId, this.now());
    if (result === "not_found") {
      throw new ApplicationError("NOT_FOUND", "Aucun brouillon n'est disponible.", 404);
    }
    if (result === "pending_corrections") {
      throw new ApplicationError(
        "CORRECTIONS_PENDING",
        "Acceptez, refusez ou signalez chaque correction avant de valider le cours.",
        409,
      );
    }
    return this.latest(user, reportId);
  }

  private validateCorrections(originalSummary: string, result: EnrichmentResult): void {
    for (const correction of result.corrections) {
      if (!originalSummary.includes(correction.originalExcerpt)) {
        throw new Error("A proposed correction does not reference the unchanged original report.");
      }
      if (correction.citationPositions.some((position) => position >= result.citations.length)) {
        throw new Error("A proposed correction references an unknown citation.");
      }
    }
  }

  private requireStudent(user: CurrentUser): void {
    if (user.role !== "student" || !user.seriesCode) {
      throw new ApplicationError(
        "FORBIDDEN",
        "L'enrichissement des bilans est réservé aux espaces élèves.",
        403,
      );
    }
  }

  private reportNotFound(): ApplicationError {
    return new ApplicationError("NOT_FOUND", "Ce bilan est introuvable.", 404);
  }
}
