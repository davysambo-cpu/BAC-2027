import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { KnowledgeCardsPanel } from "./KnowledgeCardsPanel";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("knowledge cards administration", () => {
  it("publishes a sourced card for a catalogue topic", async () => {
    const subjectId = "0d0aaab7-1b9b-457d-a6c4-fe40985d2ad2";
    const itemId = "0e16a05b-e71f-4382-a1cb-cdc1c6287eea";
    const cardId = "892032ea-2dc9-486c-88b5-d3b8c59c8310";
    let writeHeader: string | null = null;
    let submitted: Record<string, unknown> | null = null;

    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/api/v1/admin/catalogue")) {
        return Promise.resolve(
          Response.json({
            series: { id: "3199fc64-f7ee-4b7b-ab9b-fddba4a72659", code: "D", name: "Série D" },
            notice: "Catalogue de test.",
            subjects: [
              {
                id: subjectId,
                code: "MATHEMATIQUES",
                name: "Mathématiques",
                position: 30,
                validationStatus: "owner_provided",
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
                    seriesDScope: "unspecified",
                    validationStatus: "owner_provided",
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
      if (url.endsWith("/api/v1/admin/knowledge-cards") && init?.method === "POST") {
        writeHeader = new Headers(init.headers).get("X-BAC-Knowledge-Write");
        submitted = JSON.parse(String(init.body)) as Record<string, unknown>;
        return Promise.resolve(
          Response.json(
            {
              ...submitted,
              id: cardId,
              subjectId,
              subjectName: "Mathématiques",
              catalogueItemTitle: "Fonction logarithme népérien",
              version: 1,
              createdAt: "2026-10-17T14:00:00.000Z",
              updatedAt: "2026-10-17T14:00:00.000Z",
              publishedAt: "2026-10-17T14:00:00.000Z",
            },
            { status: 201 },
          ),
        );
      }
      if (url.endsWith("/api/v1/admin/knowledge-cards")) {
        return Promise.resolve(Response.json({ cards: [] }));
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    render(<KnowledgeCardsPanel />);

    expect(await screen.findByRole("heading", { name: "Fiches de savoir sourcées" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Titre de la fiche"), {
      target: { value: "Propriétés de ln" },
    });
    fireEvent.change(screen.getByLabelText("État"), { target: { value: "published" } });
    fireEvent.change(screen.getByLabelText("Titre de la source"), {
      target: { value: "Cours validé de mathématiques" },
    });
    fireEvent.change(screen.getByLabelText("Éditeur ou institution"), {
      target: { value: "Équipe pédagogique" },
    });
    fireEvent.change(screen.getByLabelText("Extrait qui justifie le contenu"), {
      target: { value: "Le logarithme népérien est défini sur les réels strictement positifs." },
    });
    fireEvent.change(screen.getByLabelText(/Objectifs/), {
      target: { value: "Utiliser les propriétés du logarithme." },
    });
    fireEvent.change(screen.getByLabelText("Synthèse vérifiée"), {
      target: { value: "Le logarithme transforme un produit de nombres positifs en une somme." },
    });
    fireEvent.change(screen.getByLabelText(/Explications/), {
      target: { value: "Les arguments du logarithme doivent être strictement positifs." },
    });
    fireEvent.change(screen.getByLabelText(/Règles de correction/), {
      target: {
        value:
          "ln(0) = 0 | ln(1) = 0 et ln(0) n'est pas défini | Le domaine de ln est strictement positif.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer la fiche" }));

    expect(
      await screen.findByText(
        "Fiche publiée : elle peut maintenant enrichir les bilans rattachés à ce thème.",
      ),
    ).toBeVisible();
    expect(writeHeader).toBe("1");
    expect(submitted).toMatchObject({
      catalogueItemId: itemId,
      status: "published",
      trustTier: "curated",
      correctionRules: [{ trigger: "ln(0) = 0" }],
    });
  });
});
