import { type FormEvent, useEffect, useMemo, useState } from "react";

import type {
  CreateKnowledgeCardRequest,
  KnowledgeCard,
  KnowledgeCardStatus,
  StudentCatalogueResponse,
} from "@bac-2027/contracts";

import {
  ApiClientError,
  createKnowledgeCard,
  getAdminCatalogue,
  listKnowledgeCards,
  updateKnowledgeCard,
} from "../auth/api";

interface KnowledgeFormState {
  subjectId: string;
  catalogueItemId: string;
  title: string;
  status: KnowledgeCardStatus;
  trustTier: "institutional" | "curated";
  sourceTitle: string;
  sourcePublisher: string;
  sourceUrl: string;
  sourceExcerpt: string;
  objectives: string;
  synthesis: string;
  definitions: string;
  explanations: string;
  examples: string;
  correctionRules: string;
}

function emptyForm(subjectId = "", catalogueItemId = ""): KnowledgeFormState {
  return {
    subjectId,
    catalogueItemId,
    title: "",
    status: "draft",
    trustTier: "curated",
    sourceTitle: "",
    sourcePublisher: "",
    sourceUrl: "",
    sourceExcerpt: "",
    objectives: "",
    synthesis: "",
    definitions: "",
    explanations: "",
    examples: "",
    correctionRules: "",
  };
}

function firstAvailableSelection(
  catalogue: StudentCatalogueResponse | null,
  cards: KnowledgeCard[],
): { subjectId: string; itemId: string } {
  const covered = new Set(cards.map((card) => card.catalogueItemId));
  for (const subject of catalogue?.subjects ?? []) {
    const item = subject.items.find((candidate) => !covered.has(candidate.id));
    if (item) return { subjectId: subject.id, itemId: item.id };
  }
  const firstSubject = catalogue?.subjects[0];
  return { subjectId: firstSubject?.id ?? "", itemId: firstSubject?.items[0]?.id ?? "" };
}

function nonEmptyLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseDefinitions(value: string) {
  return nonEmptyLines(value).map((line, index) => {
    const separator = line.indexOf("|");
    if (separator < 1 || separator === line.length - 1) {
      throw new Error(`Définition ${index + 1} : utilisez « terme | explication ».`);
    }
    return {
      term: line.slice(0, separator).trim(),
      explanation: line.slice(separator + 1).trim(),
    };
  });
}

function parseCorrectionRules(value: string) {
  return nonEmptyLines(value).map((line, index) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length !== 3 || parts.some((part) => !part)) {
      throw new Error(
        `Correction ${index + 1} : utilisez « expression | correction | explication » sur une ligne.`,
      );
    }
    return { trigger: parts[0]!, proposedText: parts[1]!, explanation: parts[2]! };
  });
}

function cardInput(card: KnowledgeCard, status = card.status) {
  return {
    catalogueItemId: card.catalogueItemId,
    title: card.title,
    status,
    trustTier: card.trustTier,
    sourceTitle: card.sourceTitle,
    sourcePublisher: card.sourcePublisher,
    sourceUrl: card.sourceUrl,
    sourceExcerpt: card.sourceExcerpt,
    content: card.content,
    correctionRules: card.correctionRules,
    version: card.version,
  };
}

export function KnowledgeCardsPanel() {
  const [catalogue, setCatalogue] = useState<StudentCatalogueResponse | null>(null);
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [editing, setEditing] = useState<KnowledgeCard | null>(null);
  const [form, setForm] = useState<KnowledgeFormState>(() => emptyForm());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getAdminCatalogue(), listKnowledgeCards()])
      .then(([nextCatalogue, response]) => {
        if (cancelled) return;
        const selection = firstAvailableSelection(nextCatalogue, response.cards);
        setCatalogue(nextCatalogue);
        setCards(response.cards);
        setForm(emptyForm(selection.subjectId, selection.itemId));
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSubject = catalogue?.subjects.find((subject) => subject.id === form.subjectId);
  const selectedItem = selectedSubject?.items.find((item) => item.id === form.catalogueItemId);
  const coveredItemIds = useMemo(() => new Set(cards.map((card) => card.catalogueItemId)), [cards]);

  function selectSubject(subjectId: string) {
    const subject = catalogue?.subjects.find((candidate) => candidate.id === subjectId);
    const firstAvailable = subject?.items.find((item) => !coveredItemIds.has(item.id));
    setForm((current) => ({
      ...current,
      subjectId,
      catalogueItemId: firstAvailable?.id ?? subject?.items[0]?.id ?? "",
    }));
  }

  function resetForm() {
    const selection = firstAvailableSelection(catalogue, cards);
    setEditing(null);
    setForm(emptyForm(selection.subjectId, selection.itemId));
    setError(null);
  }

  function editCard(card: KnowledgeCard) {
    setEditing(card);
    setForm({
      subjectId: card.subjectId,
      catalogueItemId: card.catalogueItemId,
      title: card.title,
      status: card.status,
      trustTier: card.trustTier,
      sourceTitle: card.sourceTitle,
      sourcePublisher: card.sourcePublisher,
      sourceUrl: card.sourceUrl ?? "",
      sourceExcerpt: card.sourceExcerpt,
      objectives: card.content.objectives.join("\n"),
      synthesis: card.content.synthesis,
      definitions: card.content.definitions
        .map((definition) => `${definition.term} | ${definition.explanation}`)
        .join("\n"),
      explanations: card.content.explanations.join("\n"),
      examples: card.content.examples.join("\n"),
      correctionRules: card.correctionRules
        .map((rule) => `${rule.trigger} | ${rule.proposedText} | ${rule.explanation}`)
        .join("\n"),
    });
    setError(null);
    setMessage(null);
  }

  function buildInput(): CreateKnowledgeCardRequest {
    return {
      catalogueItemId: form.catalogueItemId,
      title: form.title,
      status: form.status,
      trustTier: form.trustTier,
      sourceTitle: form.sourceTitle,
      sourcePublisher: form.sourcePublisher,
      sourceUrl: form.sourceUrl.trim() || null,
      sourceExcerpt: form.sourceExcerpt,
      content: {
        objectives: nonEmptyLines(form.objectives),
        synthesis: form.synthesis,
        definitions: parseDefinitions(form.definitions),
        explanations: nonEmptyLines(form.explanations),
        examples: nonEmptyLines(form.examples),
      },
      correctionRules: parseCorrectionRules(form.correctionRules),
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const input = buildInput();
      const saved = editing
        ? await updateKnowledgeCard(editing.id, { ...input, version: editing.version })
        : await createKnowledgeCard(input);
      const nextCards = [...cards.filter((card) => card.id !== saved.id), saved].sort(
        (left, right) =>
          `${left.subjectName}-${left.catalogueItemTitle}`.localeCompare(
            `${right.subjectName}-${right.catalogueItemTitle}`,
            "fr",
          ),
      );
      setCards(nextCards);
      setMessage(
        saved.status === "published"
          ? "Fiche publiée : elle peut maintenant enrichir les bilans rattachés à ce thème."
          : "Brouillon de fiche enregistré.",
      );
      const selection = firstAvailableSelection(catalogue, nextCards);
      setEditing(null);
      setForm(emptyForm(selection.subjectId, selection.itemId));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function changeStatus(card: KnowledgeCard, status: KnowledgeCardStatus) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await updateKnowledgeCard(card.id, cardInput(card, status));
      setCards((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      if (editing?.id === saved.id) editCard(saved);
      setMessage(status === "published" ? "Fiche publiée." : "Fiche archivée.");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <section className="panel-card knowledge-admin-panel">Chargement du corpus…</section>;
  }

  return (
    <section className="panel-card knowledge-admin-panel" aria-labelledby="knowledge-admin-title">
      <div className="panel-heading">
        <div>
          <p className="ui-eyebrow">Corpus pédagogique approuvé</p>
          <h2 id="knowledge-admin-title">Fiches de savoir sourcées</h2>
          <p>
            Une fiche publiée peut compléter uniquement les bilans rattachés au même thème du
            catalogue.
          </p>
        </div>
        <span className="knowledge-count">
          {cards.filter((card) => card.status === "published").length} publiées
        </span>
      </div>

      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="success-alert" role="status">
          {message}
        </div>
      )}

      <div className="catalogue-notice" role="note">
        <span aria-hidden="true">i</span>
        <div>
          <strong>Publication sous responsabilité de l'administration</strong>
          <p>
            Vérifiez la source et le contenu avant publication. Le niveau « institutionnel » est
            réservé à une source administrative ou institutionnelle effectivement vérifiée.
          </p>
        </div>
      </div>

      <div className="knowledge-admin-grid">
        <form className="knowledge-form" onSubmit={(event) => void submit(event)}>
          <div className="knowledge-form-heading">
            <div>
              <p className="ui-eyebrow">{editing ? "Modification" : "Nouvelle fiche"}</p>
              <h3>{editing ? editing.title : "Ajouter un contenu vérifié"}</h3>
            </div>
            {editing && (
              <button className="text-action" type="button" onClick={resetForm}>
                Annuler
              </button>
            )}
          </div>

          <div className="knowledge-form-grid">
            <label>
              Matière
              <select
                value={form.subjectId}
                disabled={Boolean(editing)}
                onChange={(event) => selectSubject(event.target.value)}
              >
                {catalogue?.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Thème du catalogue
              <select
                value={form.catalogueItemId}
                disabled={Boolean(editing)}
                onChange={(event) =>
                  setForm((current) => ({ ...current, catalogueItemId: event.target.value }))
                }
                required
              >
                {selectedSubject?.items.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={!editing && coveredItemIds.has(item.id)}
                  >
                    {item.title}
                    {item.seriesDScope === "explicitly_excludes"
                      ? " — conservé pour l'administration"
                      : ""}
                    {!editing && coveredItemIds.has(item.id) ? " — fiche existante" : ""}
                  </option>
                ))}
              </select>
              {selectedItem?.seriesDScope === "explicitly_excludes" && (
                <small>Ce thème reste masqué aux élèves de Série D.</small>
              )}
            </label>
            <label className="form-wide">
              Titre de la fiche
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder={selectedItem?.title ?? "Titre pédagogique"}
                minLength={3}
                required
              />
            </label>
            <label>
              État
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as KnowledgeCardStatus,
                  }))
                }
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publier après vérification</option>
                <option value="archived">Archiver</option>
              </select>
            </label>
            <label>
              Niveau de confiance
              <select
                value={form.trustTier}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    trustTier: event.target.value as "institutional" | "curated",
                  }))
                }
              >
                <option value="curated">Source pédagogique sélectionnée</option>
                <option value="institutional">Source institutionnelle vérifiée</option>
              </select>
            </label>
            <label>
              Titre de la source
              <input
                value={form.sourceTitle}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sourceTitle: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Éditeur ou institution
              <input
                value={form.sourcePublisher}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sourcePublisher: event.target.value }))
                }
                required
              />
            </label>
            <label className="form-wide">
              URL HTTP(S) de la source <small>(facultatif)</small>
              <input
                type="url"
                value={form.sourceUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sourceUrl: event.target.value }))
                }
                placeholder="https://…"
              />
            </label>
            <label className="form-wide">
              Extrait qui justifie le contenu
              <textarea
                value={form.sourceExcerpt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sourceExcerpt: event.target.value }))
                }
                minLength={20}
                required
              />
            </label>
            <label className="form-wide">
              Objectifs <small>un par ligne</small>
              <textarea
                value={form.objectives}
                onChange={(event) =>
                  setForm((current) => ({ ...current, objectives: event.target.value }))
                }
                required
              />
            </label>
            <label className="form-wide">
              Synthèse vérifiée
              <textarea
                value={form.synthesis}
                onChange={(event) =>
                  setForm((current) => ({ ...current, synthesis: event.target.value }))
                }
                minLength={20}
                required
              />
            </label>
            <label className="form-wide">
              Définitions <small>une ligne : terme | explication</small>
              <textarea
                value={form.definitions}
                onChange={(event) =>
                  setForm((current) => ({ ...current, definitions: event.target.value }))
                }
              />
            </label>
            <label className="form-wide">
              Explications <small>une par ligne</small>
              <textarea
                value={form.explanations}
                onChange={(event) =>
                  setForm((current) => ({ ...current, explanations: event.target.value }))
                }
                required
              />
            </label>
            <label className="form-wide">
              Exemples <small>un par ligne, facultatif</small>
              <textarea
                value={form.examples}
                onChange={(event) =>
                  setForm((current) => ({ ...current, examples: event.target.value }))
                }
              />
            </label>
            <label className="form-wide">
              Règles de correction <small>expression | correction | explication</small>
              <textarea
                value={form.correctionRules}
                onChange={(event) =>
                  setForm((current) => ({ ...current, correctionRules: event.target.value }))
                }
                placeholder="ln(0) = 0 | ln(1) = 0 et ln(0) n'est pas défini | Le domaine de ln est strictement positif."
              />
            </label>
          </div>

          <div className="knowledge-form-footer">
            <p>
              Les règles recherchent uniquement l'expression littérale indiquée. Elles ne remplacent
              pas la relecture humaine.
            </p>
            <button className="primary-action fit" type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : editing ? "Mettre à jour" : "Enregistrer la fiche"}
            </button>
          </div>
        </form>

        <div className="knowledge-card-list">
          <div className="review-section-heading">
            <div>
              <p className="ui-eyebrow">Couverture actuelle</p>
              <h3>{cards.length} fiches</h3>
            </div>
          </div>
          {cards.length === 0 ? (
            <p className="review-empty">
              Le corpus est vide. Les élèves utilisent encore le mode local sans vérification
              factuelle.
            </p>
          ) : (
            <ol>
              {cards.map((card) => (
                <li key={card.id}>
                  <div className="knowledge-card-meta">
                    <span className={`knowledge-status ${card.status}`}>
                      {statusLabel(card.status)}
                    </span>
                    <small>v{card.version}</small>
                  </div>
                  <strong>{card.title}</strong>
                  <p>
                    {card.subjectName} · {card.catalogueItemTitle}
                  </p>
                  <small>
                    {card.sourcePublisher} · {card.sourceTitle}
                  </small>
                  <div className="knowledge-card-actions">
                    <button type="button" disabled={pending} onClick={() => editCard(card)}>
                      Modifier
                    </button>
                    {card.status !== "published" && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void changeStatus(card, "published")}
                      >
                        Publier
                      </button>
                    )}
                    {card.status === "published" && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void changeStatus(card, "archived")}
                      >
                        Archiver
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

function statusLabel(status: KnowledgeCardStatus): string {
  if (status === "published") return "Publiée";
  if (status === "archived") return "Archivée";
  return "Brouillon";
}

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError
    ? error.message
    : error instanceof Error
      ? error.message
      : "L'opération n'a pas abouti.";
}
