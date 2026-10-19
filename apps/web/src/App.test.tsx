import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { clearPrivateOfflineData } from "./offline/database";

function unauthenticatedResponse() {
  return new Response(
    JSON.stringify({
      error: {
        code: "UNAUTHENTICATED",
        message: "Connectez-vous pour continuer.",
        requestId: "test-request",
      },
    }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );
}

afterEach(async () => {
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
  await clearPrivateOfflineData();
});

describe("account application", () => {
  it("redirects a guest to the login screen", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(unauthenticatedResponse()),
    );

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Bienvenue" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nom d'utilisateur")).toBeInTheDocument();
    expect(screen.getByText("Appareil personnel")).toBeInTheDocument();
  });

  it("opens an invitation link without requiring an existing session", async () => {
    window.history.replaceState({}, "", "/activation?token=temporary-token-for-test");
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(unauthenticatedResponse()),
    );

    render(<App />);

    expect(screen.getByRole("heading", { name: "Activez votre espace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activer mon compte" })).toBeEnabled();
  });

  it("opens the Série D catalogue and records a daily summary", async () => {
    window.history.replaceState({}, "", "/ressources");
    const user = {
      id: "ea4099e7-aa2e-4a0c-94be-b9dac4aeba5f",
      username: "awa07",
      displayName: "Awa Koné",
      role: "student" as const,
      status: "active" as const,
      seriesCode: "D",
    };
    const session = { deviceType: "personal" as const, expiresAt: "2026-10-17T07:00:00.000Z" };
    const subjectId = "e3ea63b6-0c90-47dc-8bb2-dd7060d74d8e";
    const itemId = "fedc451a-b68c-4dc7-9f7f-990cd0f9bc49";
    const reportId = "48b3dad3-640c-4a91-98c8-ef133de62f38";
    const draftId = "a8b09a60-4069-4426-aef9-9089a892127e";
    const citationId = "a4d0d4c9-ee2b-486a-b639-1772a5bc52c1";
    let mediaUploadHeader: string | null = null;
    let enrichmentHeader: string | null = null;
    let revisionHeader: string | null = null;
    let revisionAssessment: string | null = null;
    let draftStatus: "needs_review" | "accepted" = "needs_review";
    let planningVersion = 0;
    let planningHeader: string | null = null;
    let planningSession: Record<string, unknown> | null = null;
    const draftPayload = () => ({
      id: draftId,
      reportId,
      generationNumber: 1,
      baseReportVersion: 1,
      status: draftStatus,
      provider: "local-outline",
      model: "deterministic-v1",
      promptVersion: "daily-report-outline-v1",
      content: {
        objectives: ["Organiser les notes du cours."],
        synthesis: "Le logarithme transforme un produit en somme.",
        definitions: [],
        explanations: [],
        examples: [],
        unresolvedPoints: ["La vérification factuelle n'a pas encore été exécutée."],
      },
      failureCode: null,
      corrections: [],
      citations: [
        {
          id: citationId,
          correctionId: null,
          position: 0,
          trustTier: "catalogue",
          title: "Faso e-education - Mathématiques terminale",
          publisher: "Faso e-education",
          url: "https://fasoeducation.bf/cours/logarithme.html",
          excerpt: "Référence au thème du catalogue, sans validation factuelle du bilan.",
          retrievedAt: "2026-10-17T12:00:00.000Z",
        },
      ],
      createdAt: "2026-10-17T12:00:00.000Z",
      updatedAt: "2026-10-17T12:00:00.000Z",
      acceptedAt: draftStatus === "accepted" ? "2026-10-17T12:05:00.000Z" : null,
    });

    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(reportId);
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/api/v1/auth/me")) {
        return Promise.resolve(Response.json({ user, session }));
      }
      if (url.endsWith("/api/v1/profile")) {
        return Promise.resolve(
          Response.json({
            user,
            preferences: {
              dailyRevisionGoalMinutes: 45,
              downloadOnWifiOnly: true,
              reducedMotion: false,
            },
          }),
        );
      }
      if (url.endsWith("/api/v1/catalogue")) {
        return Promise.resolve(
          Response.json({
            series: { code: "D", name: "Série D" },
            notice: "Catalogue pédagogique initial, validation institutionnelle en attente.",
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
                    position: 3,
                    sourceUrl: "https://fasoeducation.bf/cours/logarithme.html",
                    seriesMention: null,
                    seriesLabels: [],
                    seriesDScope: "unspecified",
                    sourceSeriesDScope: "unspecified",
                    adminSeriesDDecision: null,
                    validationStatus: "owner_provided",
                    validationNote: null,
                    validationSourceUrl: null,
                    validatedAt: null,
                    validationVersion: 1,
                    source: {
                      title: "Faso e-education - Mathématiques terminale",
                      publisher: "Faso e-education",
                      validationStatus: "owner_provided",
                    },
                  },
                ],
              },
            ],
          }),
        );
      }
      if (url.endsWith("/api/v1/planning/sessions") && init?.method === "POST") {
        planningHeader = new Headers(init.headers).get("X-BAC-Planning");
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        planningVersion = 1;
        planningSession = {
          ...body,
          subjectName: body.subjectId ? "Mathématiques" : null,
          catalogueItemTitle: body.catalogueItemId ? "Fonction logarithme népérien" : null,
          status: "planned",
          completedAt: null,
          version: planningVersion,
          createdAt: "2026-10-17T12:00:00.000Z",
          updatedAt: "2026-10-17T12:00:00.000Z",
        };
        return Promise.resolve(Response.json(planningSession, { status: 201 }));
      }
      if (url.includes("/api/v1/planning/sessions/") && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        planningVersion += 1;
        planningSession = {
          ...planningSession,
          ...body,
          version: planningVersion,
          completedAt: body.status === "completed" ? "2026-10-17T13:00:00.000Z" : null,
          updatedAt: "2026-10-17T13:00:00.000Z",
        };
        return Promise.resolve(Response.json(planningSession));
      }
      if (url.includes("/api/v1/planning/sessions/") && init?.method === "DELETE") {
        planningSession = null;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      if (url.endsWith("/api/v1/planning/sessions")) {
        return Promise.resolve(
          Response.json({
            generatedAt: "2026-10-17T12:00:00.000Z",
            sessions: planningSession ? [planningSession] : [],
          }),
        );
      }
      if (url.endsWith(`/api/v1/revision/topics/${itemId}/reviews`) && init?.method === "POST") {
        revisionHeader = new Headers(init.headers).get("X-BAC-Revision");
        const body = JSON.parse(String(init.body)) as { assessment: string; note: string | null };
        revisionAssessment = body.assessment;
        return Promise.resolve(
          Response.json(
            {
              id: "df5461bf-3c87-4a8b-8f05-3e42f4162e31",
              catalogueItemId: itemId,
              assessment: body.assessment,
              note: body.note,
              reviewedAt: "2026-10-17T12:00:00.000Z",
              nextReviewAt: "2026-10-20T12:00:00.000Z",
            },
            { status: 201 },
          ),
        );
      }
      if (url.endsWith("/api/v1/revision/topics")) {
        return Promise.resolve(
          Response.json({
            generatedAt: "2026-10-17T12:00:00.000Z",
            targetMonth: "2027-07",
            summary: {
              totalTopics: 1,
              startedTopics: 0,
              coursesReady: 0,
              reviewedTopics: 0,
              masteredTopics: 0,
              dueTopics: 0,
            },
            topics: [
              {
                catalogueItemId: itemId,
                subjectId,
                subjectName: "Mathématiques",
                title: "Fonction logarithme népérien",
                section: "Mathématiques",
                reportCount: 0,
                acceptedCourseCount: 0,
                latestLessonDate: null,
                reviewCount: 0,
                latestReview: null,
                stage: "not_started",
                isDue: false,
              },
            ],
          }),
        );
      }
      if (url.endsWith(`/api/v1/daily-reports/${reportId}/attachments`)) {
        mediaUploadHeader = new Headers(init?.headers).get("X-BAC-Media-Upload");
        const form = init?.body as FormData;
        const media = form.get("media") as File;
        return Promise.resolve(
          Response.json(
            {
              id: String(form.get("id")),
              reportId,
              kind: form.get("kind"),
              originalName: media.name,
              mimeType: "image/jpeg",
              sizeBytes: media.size,
              checksumSha256: "a".repeat(64),
              durationSeconds: null,
              processingStatus: "stored",
              contentPath: `/api/v1/daily-reports/${reportId}/attachments/${String(form.get("id"))}/content`,
              createdAt: "2026-10-17T12:00:00.000Z",
            },
            { status: 201 },
          ),
        );
      }
      if (url.endsWith(`/api/v1/daily-reports/${reportId}/enrichment`)) {
        enrichmentHeader = new Headers(init?.headers).get("X-BAC-Enrichment");
        return Promise.resolve(Response.json(draftPayload(), { status: 201 }));
      }
      if (url.endsWith(`/api/v1/daily-reports/${reportId}/draft/accept`)) {
        enrichmentHeader = new Headers(init?.headers).get("X-BAC-Enrichment");
        draftStatus = "accepted";
        return Promise.resolve(Response.json(draftPayload()));
      }
      if (url.endsWith("/api/v1/daily-reports") && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        return Promise.resolve(
          Response.json(
            {
              ...body,
              studentId: user.id,
              enrichmentStatus: "not_requested",
              version: 1,
              createdAt: "2026-10-17T12:00:00.000Z",
              updatedAt: "2026-10-17T12:00:00.000Z",
            },
            { status: 201 },
          ),
        );
      }
      if (url.endsWith("/api/v1/daily-reports")) {
        return Promise.resolve(Response.json({ reports: [] }));
      }
      return Promise.resolve(unauthenticatedResponse());
    });

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Mon carnet de révision" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("tab", { name: /Mathématiques/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByText("Fonction logarithme népérien")).toBeInTheDocument();

    window.dispatchEvent(new Event("offline"));
    expect(await screen.findByText("Hors ligne")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Faire le point" }));
    expect(
      screen.getByRole("heading", { name: "Faire le point : Fonction logarithme népérien" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Fragile/));
    fireEvent.change(screen.getByLabelText(/Point à reprendre/), {
      target: { value: "Refaire l'exercice 4." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer cette révision" }));
    expect(
      await screen.findByText(
        /Révision sauvegardée sur cet appareil.*prochain rappel conseillé le/,
      ),
    ).toBeInTheDocument();
    expect(revisionHeader).toBeNull();

    window.dispatchEvent(new Event("online"));
    await waitFor(() => expect(revisionHeader).toBe("1"));
    expect(revisionAssessment).toBe("fragile");
    expect(await screen.findByText("Synchronisé")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Nouveau bilan" }));
    fireEvent.change(screen.getByLabelText("Titre"), {
      target: { value: "Le logarithme" },
    });
    fireEvent.change(screen.getByLabelText("Ce que j'ai noté ou retenu"), {
      target: { value: "Le logarithme transforme un produit en somme." },
    });
    const notebookPhoto = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x42, 0x32, 0x37])],
      "cahier.jpg",
      { type: "image/jpeg" },
    );
    fireEvent.change(screen.getByLabelText(/Photo du cahier/), {
      target: { files: [notebookPhoto] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer mon bilan" }));

    expect(
      await screen.findByText("Bilan et médias enregistrés et synchronisés."),
    ).toBeInTheDocument();
    expect(mediaUploadHeader).toBe("1");
    expect(screen.getByText("Le logarithme")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Structurer ce cours" }));
    expect(await screen.findByRole("heading", { name: "Cours structuré" })).toBeInTheDocument();
    expect(screen.getByText(/Mode local gratuit/)).toBeInTheDocument();
    expect(screen.getByText("Catalogue fourni")).toBeInTheDocument();
    expect(enrichmentHeader).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: "Valider comme cours personnel" }));
    expect(
      await screen.findByText(
        "Le brouillon a été validé comme cours personnel et ajouté au suivi de révision. Le bilan original reste conservé.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Cours validé")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("link", { name: "Planning" })[0]!);
    expect(
      await screen.findByRole("heading", { name: "Planning de révision" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ Planifier une séance" }));
    fireEvent.change(screen.getByLabelText(/Matière/), { target: { value: subjectId } });
    fireEvent.change(screen.getByLabelText(/Thème du programme/), {
      target: { value: itemId },
    });
    fireEvent.change(screen.getByLabelText("Titre"), {
      target: { value: "Revoir le logarithme" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter au planning" }));
    expect(await screen.findByText("Séance ajoutée au planning.")).toBeInTheDocument();
    expect(planningHeader).toBe("1");
    expect(screen.getByText("Revoir le logarithme")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Terminer" }));
    expect(await screen.findByText("Séance terminée. Bravo !")).toBeInTheDocument();
    expect(screen.getByText("Terminée")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(await screen.findByText("Séance supprimée du planning.")).toBeInTheDocument();
    expect(screen.queryByText("Revoir le logarithme")).not.toBeInTheDocument();
  });

  it("connects an invited student and opens the protected space", async () => {
    let authenticated = false;
    let profilePreviewSession: string | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/api/v1/auth/login") && init?.method === "POST") {
        authenticated = true;
        return Promise.resolve(
          Response.json({
            user: {
              id: "ea4099e7-aa2e-4a0c-94be-b9dac4aeba5f",
              username: "awa07",
              displayName: "Awa Koné",
              role: "student",
              status: "active",
              seriesCode: "D",
            },
            session: { deviceType: "shared", expiresAt: "2026-10-17T07:00:00.000Z" },
            sessionAccessToken: "preview-session-access-token-kept-only-in-memory-2027",
          }),
        );
      }
      if (url.endsWith("/api/v1/profile") && authenticated) {
        profilePreviewSession = new Headers(init?.headers).get("X-BAC-Preview-Session");
        return Promise.resolve(
          Response.json({
            user: {
              id: "ea4099e7-aa2e-4a0c-94be-b9dac4aeba5f",
              username: "awa07",
              displayName: "Awa Koné",
              role: "student",
              status: "active",
              seriesCode: "D",
            },
            preferences: {
              dailyRevisionGoalMinutes: 45,
              downloadOnWifiOnly: true,
              reducedMotion: false,
            },
          }),
        );
      }
      return Promise.resolve(unauthenticatedResponse());
    });

    render(<App />);
    await screen.findByRole("heading", { name: "Bienvenue" });
    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), {
      target: { value: "awa07" },
    });
    fireEvent.change(screen.getByLabelText(/Mot de passe/), {
      target: { value: "Eleve-BAC-2027" },
    });
    fireEvent.click(screen.getByLabelText(/Appareil partagé/));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByRole("heading", { name: "Bonjour Awa Koné" })).toBeInTheDocument();
    expect(screen.getByText("@awa07")).toBeInTheDocument();
    expect(profilePreviewSession).toBe("preview-session-access-token-kept-only-in-memory-2027");
  });
});
