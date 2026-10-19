import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CatalogueValidationPanel } from "./CatalogueValidationPanel";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("catalogue validation administration", () => {
  it("confirms visible topics with an explicit pedagogical decision", async () => {
    const subjectId = "0d0aaab7-1b9b-457d-a6c4-fe40985d2ad2";
    const itemId = "0e16a05b-e71f-4382-a1cb-cdc1c6287eea";
    let confirmed = false;
    let writeHeader: string | null = null;
    let submitted: Record<string, unknown> | null = null;

    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/api/v1/admin/catalogue") && !init?.method) {
        return Promise.resolve(
          Response.json({
            series: { code: "D", name: "Série D" },
            notice: "Catalogue administratif de test.",
            subjects: [
              {
                id: subjectId,
                code: "MATHEMATIQUES",
                name: "Mathématiques",
                position: 30,
                validationStatus: confirmed ? "pedagogically_validated" : "owner_provided",
                items: [
                  {
                    id: itemId,
                    code: "MATH-001",
                    title: "Fonction logarithme népérien",
                    section: "Mathématiques",
                    position: 1,
                    sourceUrl: "https://example.test/catalogue",
                    seriesMention: null,
                    seriesLabels: [],
                    seriesDScope: confirmed ? "explicitly_includes" : "unspecified",
                    sourceSeriesDScope: "unspecified",
                    adminSeriesDDecision: confirmed ? "explicitly_includes" : null,
                    validationStatus: confirmed ? "pedagogically_validated" : "owner_provided",
                    validationNote: confirmed
                      ? "Vérification manuelle de toutes les matières de la Série D."
                      : null,
                    validationSourceUrl: null,
                    validatedAt: confirmed ? "2026-10-19T02:00:00.000Z" : null,
                    validationVersion: confirmed ? 2 : 1,
                    source: {
                      title: "Catalogue test",
                      publisher: "BAC-2027",
                      validationStatus: "owner_provided",
                    },
                  },
                ],
              },
            ],
          }),
        );
      }
      if (url.endsWith("/api/v1/admin/catalogue/confirmations") && init?.method === "POST") {
        writeHeader = new Headers(init.headers).get("X-BAC-Catalogue-Validation");
        submitted = JSON.parse(String(init.body)) as Record<string, unknown>;
        confirmed = true;
        return Promise.resolve(
          Response.json({
            updatedItems: 1,
            updatedSubjects: 1,
            validatedAt: "2026-10-19T02:00:00.000Z",
          }),
        );
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    render(<CatalogueValidationPanel />);

    expect(
      await screen.findByRole("heading", { name: "Validation du catalogue Série D" }),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("Justification"), {
      target: { value: "Vérification manuelle de toutes les matières de la Série D." },
    });
    fireEvent.click(screen.getByLabelText("Je confirme avoir vérifié tous les thèmes concernés."));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer 1 thème(s)" }));

    expect(await screen.findByText("1 thème confirmé.")).toBeVisible();
    expect(await screen.findByText("Confirmé pédagogiquement")).toBeVisible();
    expect(writeHeader).toBe("1");
    expect(submitted).toEqual({
      subjectId: null,
      validationLevel: "pedagogically_validated",
      justification: "Vérification manuelle de toutes les matières de la Série D.",
      sourceUrl: null,
    });
  });
});
