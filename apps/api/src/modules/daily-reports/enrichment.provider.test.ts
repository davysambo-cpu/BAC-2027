import { describe, expect, it } from "vitest";

import { LocalOutlineEnrichmentProvider } from "./enrichment.provider";

describe("local outline enrichment provider", () => {
  it("keeps the original text intact and labels unverified work", async () => {
    const originalSummary = "La note originale, avec sa formulation exacte.";
    const provider = new LocalOutlineEnrichmentProvider(() => new Date("2026-10-17T12:00:00.000Z"));

    const result = await provider.generate({
      report: {
        id: "3189e640-61da-4ccf-a898-5894e3831704",
        version: 1,
        title: "Un cours",
        originalSummary,
        understoodPoints: "Un point compris.",
        questions: "Une question ?",
      },
      subjectName: "Mathématiques",
      catalogueItem: {
        title: "Un thème du catalogue",
        section: "Mathématiques",
        url: "https://example.test/theme",
        validationStatus: "owner_provided",
      },
      catalogueSource: {
        title: "Catalogue fourni",
        publisher: "Portail pédagogique",
        url: "https://example.test/catalogue",
        validationStatus: "owner_provided",
      },
    });

    expect(result.content.synthesis).toBe(originalSummary);
    expect(result.content.explanations[0]).toContain("Point déclaré comme compris");
    expect(result.content.unresolvedPoints).toEqual(
      expect.arrayContaining([expect.stringContaining("vérification factuelle")]),
    );
    expect(result.corrections).toEqual([]);
    expect(result.citations).toMatchObject([
      {
        trustTier: "catalogue",
        title: "Catalogue fourni",
        retrievedAt: new Date("2026-10-17T12:00:00.000Z"),
      },
    ]);
  });
});
