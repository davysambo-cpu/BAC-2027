import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type {
  CatalogueItem,
  CatalogueSeriesDecision,
  CatalogueValidationLevel,
  StudentCatalogueResponse,
} from "@bac-2027/contracts";

import {
  ApiClientError,
  confirmCatalogueItems,
  getAdminCatalogue,
  updateCatalogueItemValidation,
} from "../auth/api";

type StatusFilter = "all" | "confirmed" | "pending" | "excluded";

interface ItemEditorState {
  item: CatalogueItem;
  decision: CatalogueSeriesDecision;
  validationLevel: CatalogueValidationLevel;
  justification: string;
  sourceUrl: string;
}

export function CatalogueValidationPanel() {
  const [catalogue, setCatalogue] = useState<StudentCatalogueResponse | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<ItemEditorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [bulkConfirmed, setBulkConfirmed] = useState(false);

  const loadCatalogue = useCallback(async () => {
    try {
      setCatalogue(await getAdminCatalogue());
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getAdminCatalogue()
      .then((nextCatalogue) => {
        if (!cancelled) {
          setCatalogue(nextCatalogue);
          setError(null);
        }
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

  const allItems = useMemo(
    () =>
      (catalogue?.subjects ?? []).flatMap((subject) =>
        subject.items.map((item) => ({ item, subjectId: subject.id, subjectName: subject.name })),
      ),
    [catalogue],
  );

  const counts = useMemo(
    () => ({
      confirmed: allItems.filter(({ item }) => item.adminSeriesDDecision === "explicitly_includes")
        .length,
      pending: allItems.filter(({ item }) => isBulkCandidate(item)).length,
      excluded: allItems.filter(({ item }) => item.seriesDScope === "explicitly_excludes").length,
    }),
    [allItems],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return allItems.filter(({ item, subjectId: itemSubjectId, subjectName }) => {
      if (subjectId && subjectId !== itemSubjectId) return false;
      if (statusFilter !== "all" && itemStatus(item) !== statusFilter) return false;
      return !query || `${item.title} ${subjectName}`.toLocaleLowerCase("fr").includes(query);
    });
  }, [allItems, search, statusFilter, subjectId]);

  const bulkCandidateCount = allItems.filter(
    ({ item, subjectId: itemSubjectId }) =>
      (!subjectId || subjectId === itemSubjectId) && isBulkCandidate(item),
  ).length;

  function openEditor(item: CatalogueItem) {
    setEditor({
      item,
      decision:
        item.adminSeriesDDecision === "explicitly_includes"
          ? "confirmed"
          : item.adminSeriesDDecision === "explicitly_excludes"
            ? "excluded"
            : "pending",
      validationLevel:
        item.validationStatus === "institutionally_validated"
          ? "institutionally_validated"
          : "pedagogically_validated",
      justification: item.validationNote ?? "",
      sourceUrl: item.validationSourceUrl ?? "",
    });
    setError(null);
    setMessage(null);
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await updateCatalogueItemValidation(editor.item.id, {
        decision: editor.decision,
        validationLevel: editor.decision === "confirmed" ? editor.validationLevel : null,
        justification: editor.justification,
        sourceUrl: editor.sourceUrl.trim() || null,
        version: editor.item.validationVersion,
      });
      setMessage(`La décision concernant « ${editor.item.title} » est enregistrée.`);
      setEditor(null);
      await loadCatalogue();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function confirmBulk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const validationLevel =
        fields.get("validationLevel") === "institutionally_validated"
          ? "institutionally_validated"
          : "pedagogically_validated";
      const result = await confirmCatalogueItems({
        subjectId: subjectId || null,
        validationLevel,
        justification: String(fields.get("justification") ?? ""),
        sourceUrl: String(fields.get("sourceUrl") ?? "").trim() || null,
      });
      setMessage(
        result.updatedItems > 0
          ? `${result.updatedItems} thème${result.updatedItems > 1 ? "s" : ""} confirmé${result.updatedItems > 1 ? "s" : ""}.`
          : "Aucun nouveau thème ne nécessitait une confirmation.",
      );
      setBulkConfirmed(false);
      form.reset();
      await loadCatalogue();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel-card catalogue-validation-panel">
      <div className="panel-heading catalogue-validation-heading">
        <div>
          <p className="ui-eyebrow">Décisions traçables</p>
          <h2>Validation du catalogue Série D</h2>
          <p>
            Une confirmation pédagogique atteste votre vérification. Le niveau institutionnel exige
            une source officielle identifiable.
          </p>
        </div>
        <button className="text-action" type="button" onClick={() => void loadCatalogue()}>
          Actualiser
        </button>
      </div>

      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="form-success" role="status">
          {message}
        </div>
      )}

      <div className="catalogue-validation-summary" aria-label="État des validations">
        <article>
          <span>✓</span>
          <div>
            <strong>{counts.confirmed}</strong>
            <small>confirmés par l’administration</small>
          </div>
        </article>
        <article>
          <span>?</span>
          <div>
            <strong>{counts.pending}</strong>
            <small>encore à confirmer</small>
          </div>
        </article>
        <article>
          <span>—</span>
          <div>
            <strong>{counts.excluded}</strong>
            <small>masqués pour la Série D</small>
          </div>
        </article>
      </div>

      <form className="catalogue-bulk-form" onSubmit={(event) => void confirmBulk(event)}>
        <div>
          <p className="ui-eyebrow">Confirmation groupée</p>
          <h3>Confirmer les thèmes visibles vérifiés</h3>
          <p>
            {bulkCandidateCount} thème{bulkCandidateCount > 1 ? "s" : ""} sans décision dans la
            sélection. Les entrées explicitement rattachées à une autre série restent masquées.
          </p>
        </div>
        <label>
          Matière
          <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
            <option value="">Toutes les matières</option>
            {catalogue?.subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Niveau de validation
          <select name="validationLevel" defaultValue="pedagogically_validated">
            <option value="pedagogically_validated">Vérification pédagogique</option>
            <option value="institutionally_validated">Source institutionnelle officielle</option>
          </select>
        </label>
        <label className="form-wide">
          Justification
          <textarea
            name="justification"
            minLength={10}
            maxLength={1000}
            placeholder="Ex. Vérification manuelle de toutes les matières par l’administrateur."
            required
          />
        </label>
        <label className="form-wide">
          Lien de la preuve officielle, si disponible
          <input name="sourceUrl" type="url" placeholder="https://…" />
        </label>
        <label className="catalogue-confirm-check form-wide">
          <input
            type="checkbox"
            checked={bulkConfirmed}
            onChange={(event) => setBulkConfirmed(event.target.checked)}
          />
          <span>Je confirme avoir vérifié tous les thèmes concernés.</span>
        </label>
        <button
          className="primary-action fit"
          type="submit"
          disabled={pending || !bulkConfirmed || bulkCandidateCount === 0}
        >
          {pending ? "Enregistrement…" : `Confirmer ${bulkCandidateCount} thème(s)`}
        </button>
      </form>

      <div className="catalogue-validation-toolbar">
        <label>
          Rechercher
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Titre ou matière…"
          />
        </label>
        <label>
          État
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">Tous les états</option>
            <option value="confirmed">Confirmés</option>
            <option value="pending">À confirmer</option>
            <option value="excluded">Masqués</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p>Chargement du catalogue…</p>
      ) : (
        <div className="catalogue-validation-list">
          {filteredItems.map(({ item, subjectName }) => (
            <article key={item.id} className="catalogue-validation-item">
              <div className="catalogue-validation-copy">
                <div>
                  <span className={`catalogue-decision ${itemStatus(item)}`}>
                    {itemStatusLabel(item)}
                  </span>
                  <small>{subjectName}</small>
                </div>
                <h3>{item.title}</h3>
                <p>
                  Source : {item.source.title}
                  {item.seriesMention ? ` · Mention originale : ${item.seriesMention}` : ""}
                </p>
                {item.validationNote && (
                  <p className="catalogue-validation-note">
                    <strong>Justification :</strong> {item.validationNote}
                    {item.validatedAt ? ` · ${formatDate(item.validatedAt)}` : ""}
                  </p>
                )}
              </div>
              <button className="secondary-action" type="button" onClick={() => openEditor(item)}>
                Modifier la décision
              </button>
            </article>
          ))}
          {filteredItems.length === 0 && (
            <p className="empty-state">Aucun thème ne correspond à ces filtres.</p>
          )}
        </div>
      )}

      {editor && (
        <div className="catalogue-item-editor-backdrop">
          <form
            className="catalogue-item-editor"
            role="dialog"
            aria-modal="true"
            aria-label={`Décision concernant ${editor.item.title}`}
            onSubmit={(event) => void saveItem(event)}
          >
            <div className="panel-heading">
              <div>
                <p className="ui-eyebrow">Décision individuelle</p>
                <h3>{editor.item.title}</h3>
              </div>
              <button className="text-action" type="button" onClick={() => setEditor(null)}>
                Fermer
              </button>
            </div>
            <label>
              Décision
              <select
                value={editor.decision}
                onChange={(event) =>
                  setEditor((current) =>
                    current
                      ? { ...current, decision: event.target.value as CatalogueSeriesDecision }
                      : current,
                  )
                }
              >
                <option value="confirmed">Confirmer pour la Série D</option>
                <option value="excluded">Exclure de la Série D</option>
                <option value="pending">Laisser à confirmer</option>
              </select>
            </label>
            {editor.decision === "confirmed" && (
              <label>
                Niveau
                <select
                  value={editor.validationLevel}
                  onChange={(event) =>
                    setEditor((current) =>
                      current
                        ? {
                            ...current,
                            validationLevel: event.target.value as CatalogueValidationLevel,
                          }
                        : current,
                    )
                  }
                >
                  <option value="pedagogically_validated">Vérification pédagogique</option>
                  <option value="institutionally_validated">Validation institutionnelle</option>
                </select>
              </label>
            )}
            <label className="form-wide">
              Justification
              <textarea
                value={editor.justification}
                onChange={(event) =>
                  setEditor((current) =>
                    current ? { ...current, justification: event.target.value } : current,
                  )
                }
                minLength={10}
                maxLength={1000}
                required
              />
            </label>
            <label className="form-wide">
              Lien de la preuve officielle, si disponible
              <input
                type="url"
                value={editor.sourceUrl}
                onChange={(event) =>
                  setEditor((current) =>
                    current ? { ...current, sourceUrl: event.target.value } : current,
                  )
                }
                required={
                  editor.decision === "confirmed" &&
                  editor.validationLevel === "institutionally_validated"
                }
                placeholder="https://…"
              />
            </label>
            <div className="catalogue-item-editor-actions form-wide">
              <button className="secondary-action" type="button" onClick={() => setEditor(null)}>
                Annuler
              </button>
              <button className="primary-action" type="submit" disabled={pending}>
                {pending ? "Enregistrement…" : "Enregistrer la décision"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function isBulkCandidate(item: CatalogueItem): boolean {
  return (
    item.adminSeriesDDecision === null &&
    item.sourceSeriesDScope !== "explicitly_excludes" &&
    item.validationStatus !== "excluded"
  );
}

function itemStatus(item: CatalogueItem): Exclude<StatusFilter, "all"> {
  if (item.adminSeriesDDecision === "explicitly_includes") return "confirmed";
  if (item.seriesDScope === "explicitly_excludes" || item.validationStatus === "excluded") {
    return "excluded";
  }
  return "pending";
}

function itemStatusLabel(item: CatalogueItem): string {
  if (item.adminSeriesDDecision === "explicitly_includes") {
    return item.validationStatus === "institutionally_validated"
      ? "Validé institutionnellement"
      : "Confirmé pédagogiquement";
  }
  if (item.adminSeriesDDecision === "explicitly_excludes") return "Exclu par l’administration";
  if (item.sourceSeriesDScope === "explicitly_excludes") return "Autre série dans la source";
  if (item.sourceSeriesDScope === "explicitly_includes") return "Série D indiquée · à valider";
  return "Compatibilité à confirmer";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-BF", { dateStyle: "medium" }).format(new Date(value));
}

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : "La validation n'a pas abouti.";
}
