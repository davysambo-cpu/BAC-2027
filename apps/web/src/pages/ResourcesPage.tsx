import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";

import type {
  CatalogueItem,
  CourseDraft,
  CreateDailyReportRequest,
  DailyReport,
  ReviewDraftCorrectionRequest,
  StudentCatalogueResponse,
} from "@bac-2027/contracts";

import {
  acceptCourseDraft,
  ApiClientError,
  createDailyReport,
  generateCourseDraft,
  getCourseDraft,
  getStudentCatalogue,
  listDailyReports,
  reviewDraftCorrection,
  uploadDailyReportAttachment,
} from "../auth/api";
import { useAuth } from "../auth/auth-context";
import { AppShell } from "../components/AppShell";
import {
  cacheCatalogue,
  cacheCourseDraft,
  readCachedCatalogue,
  readCachedCourseDraft,
  type LocalDailyReport,
} from "../offline/database";
import {
  listLocalDailyReports,
  markDailyReportAttachmentSynced,
  markDailyReportAttachmentSyncFailed,
  markDailyReportSynced,
  markDailyReportSyncFailed,
  pendingDailyReportAttachments,
  pendingDailyReports,
  stageDailyReport,
  storeServerDailyReports,
  type LocalAttachmentInput,
} from "../offline/daily-reports";

const maxPhotoBytes = 5 * 1024 * 1024;
const maxAudioBytes = 10 * 1024 * 1024;
const maxPhotos = 2;

interface FormState {
  lessonDate: string;
  subjectId: string;
  catalogueItemId: string;
  title: string;
  originalSummary: string;
  understoodPoints: string;
  questions: string;
}

type ReportView = DailyReport | LocalDailyReport;

function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function emptyForm(subjectId = ""): FormState {
  return {
    lessonDate: today(),
    subjectId,
    catalogueItemId: "",
    title: "",
    originalSummary: "",
    understoodPoints: "",
    questions: "",
  };
}

function reportTimestamp(report: ReportView): number {
  return new Date(report.updatedAt).getTime();
}

function sourceTierLabel(tier: CourseDraft["citations"][number]["trustTier"]): string {
  return {
    institutional: "Source institutionnelle",
    curated: "Source pédagogique sélectionnée",
    catalogue: "Catalogue fourni",
    web: "Source web complémentaire",
  }[tier];
}

function correctionStatusLabel(status: CourseDraft["corrections"][number]["reviewStatus"]): string {
  return {
    proposed: "Décision requise",
    accepted: "Correction acceptée",
    rejected: "Correction refusée",
    ask_teacher: "À demander au professeur",
  }[status];
}

async function transferAttachments(
  reportId: string,
  items: LocalAttachmentInput[],
  persistSyncState: boolean,
): Promise<number> {
  let failures = 0;
  for (const item of items) {
    try {
      const uploaded = await uploadDailyReportAttachment(reportId, {
        id: item.id,
        kind: item.kind,
        originalName: item.name,
        content: item.blob,
        durationSeconds: item.durationSeconds,
      });
      if (persistSyncState) await markDailyReportAttachmentSynced(uploaded);
    } catch {
      failures += 1;
      if (persistSyncState) await markDailyReportAttachmentSyncFailed(item.id);
    }
  }
  return failures;
}

export default function ResourcesPage() {
  const auth = useAuth();
  const [catalogue, setCatalogue] = useState<StudentCatalogueResponse | null>(null);
  const [reports, setReports] = useState<ReportView[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [attachments, setAttachments] = useState<LocalAttachmentInput[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportView | null>(null);
  const [courseDraft, setCourseDraft] = useState<CourseDraft | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const personalDevice = auth.session?.deviceType === "personal";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!auth.user) return;
      setLoading(true);
      setLoadError(null);

      if (personalDevice) {
        const localReports = await listLocalDailyReports(auth.user.id);
        if (!cancelled)
          setReports(localReports.sort((a, b) => reportTimestamp(b) - reportTimestamp(a)));
      }

      let nextCatalogue: StudentCatalogueResponse | null = null;
      try {
        nextCatalogue = await getStudentCatalogue();
        await cacheCatalogue(nextCatalogue);
      } catch {
        nextCatalogue = await readCachedCatalogue(auth.user.seriesCode ?? "D");
      }
      if (cancelled) return;
      if (!nextCatalogue) {
        setLoadError("Le catalogue n'est pas encore disponible sur cet appareil.");
        setLoading(false);
        return;
      }
      setCatalogue(nextCatalogue);
      setSelectedSubjectId((current) => current || nextCatalogue.subjects[0]?.id || "");
      setForm((current) => ({
        ...current,
        subjectId: current.subjectId || nextCatalogue.subjects[0]?.id || "",
      }));

      if (auth.user.role !== "student") {
        setLoading(false);
        return;
      }

      try {
        if (personalDevice) {
          const pending = await pendingDailyReports(auth.user.id);
          for (const report of pending) {
            try {
              await markDailyReportSynced(await createDailyReport(report));
            } catch (error) {
              await markDailyReportSyncFailed(
                report.id,
                error instanceof Error ? error.message : "Synchronisation impossible.",
              );
            }
          }
          const pendingAttachments = await pendingDailyReportAttachments(auth.user.id);
          for (const attachment of pendingAttachments) {
            if (!attachment.localBlob) continue;
            await transferAttachments(
              attachment.reportId,
              [
                {
                  id: attachment.id,
                  kind: attachment.kind,
                  name: attachment.originalName,
                  mimeType: attachment.mimeType,
                  blob: attachment.localBlob,
                  durationSeconds: attachment.durationSeconds,
                },
              ],
              true,
            );
          }
        }
        const serverReports = (await listDailyReports()).reports;
        if (personalDevice) {
          await storeServerDailyReports(serverReports);
          const merged = await listLocalDailyReports(auth.user.id);
          if (!cancelled)
            setReports(merged.sort((a, b) => reportTimestamp(b) - reportTimestamp(a)));
        } else if (!cancelled) {
          setReports(serverReports);
        }
      } catch (error) {
        if (!personalDevice && !cancelled) {
          setLoadError(
            error instanceof ApiClientError
              ? error.message
              : "Les bilans ne sont pas accessibles sans connexion sur un appareil partagé.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [auth.user, personalDevice]);

  const selectedSubject = catalogue?.subjects.find((subject) => subject.id === selectedSubjectId);
  const formSubject = catalogue?.subjects.find((subject) => subject.id === form.subjectId);
  const formItems = formSubject?.items ?? [];
  const filteredItems = useMemo(() => {
    const items = selectedSubject?.items ?? [];
    const query = normalizeSearch(search.trim());
    if (!query) return items;
    return items.filter((item) => normalizeSearch(`${item.title} ${item.section}`).includes(query));
  }, [search, selectedSubject]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, CatalogueItem[]>();
    for (const item of filteredItems) {
      const group = groups.get(item.section) ?? [];
      group.push(item);
      groups.set(item.section, group);
    }
    return [...groups.entries()];
  }, [filteredItems]);

  function openForm(item?: CatalogueItem) {
    const subjectId = item
      ? selectedSubjectId
      : selectedSubjectId || catalogue?.subjects[0]?.id || "";
    setForm({
      ...emptyForm(subjectId),
      catalogueItemId: item?.id ?? "",
      title: item?.title.replace(/\s*\(terminales?[^)]*\)\s*$/i, "") ?? "",
    });
    setAttachments([]);
    setFormError(null);
    setMessage(null);
    setFormOpen(true);
  }

  function selectFormSubject(subjectId: string) {
    setForm((current) => ({
      ...current,
      subjectId,
      catalogueItemId: "",
    }));
  }

  function selectFormItem(itemId: string) {
    const item = formItems.find((candidate) => candidate.id === itemId);
    setForm((current) => ({
      ...current,
      catalogueItemId: itemId,
      title: current.title || item?.title.replace(/\s*\(terminales?[^)]*\)\s*$/i, "") || "",
    }));
  }

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    setFormError(null);
    const files = [...(event.target.files ?? [])];
    const currentPhotos = attachments.filter((attachment) => attachment.kind === "image").length;
    if (currentPhotos + files.length > maxPhotos) {
      setFormError(`Ajoutez au maximum ${maxPhotos} photos par bilan pour le pilote.`);
      event.target.value = "";
      return;
    }
    const unsupported = files.find(
      (file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type),
    );
    if (unsupported) {
      setFormError(`Le format de la photo « ${unsupported.name} » n'est pas accepté.`);
      event.target.value = "";
      return;
    }
    const tooLarge = files.find((file) => file.size > maxPhotoBytes);
    if (tooLarge) {
      setFormError(`La photo « ${tooLarge.name} » dépasse 5 Mo.`);
      event.target.value = "";
      return;
    }
    setAttachments((current) => [
      ...current,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        kind: "image" as const,
        name: file.name,
        mimeType: file.type || "image/jpeg",
        blob: file,
        durationSeconds: null,
      })),
    ]);
    event.target.value = "";
  }

  function addAudio(event: ChangeEvent<HTMLInputElement>) {
    setFormError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      setFormError(`Le format de l'audio « ${file.name} » n'est pas accepté.`);
    } else if (attachments.some((attachment) => attachment.kind === "audio")) {
      setFormError("Un seul audio est accepté par bilan dans le pilote.");
    } else if (file.size > maxAudioBytes) {
      setFormError(`L'audio « ${file.name} » dépasse 10 Mo.`);
    } else {
      setAttachments((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          kind: "audio",
          name: file.name,
          mimeType: file.type || "audio/webm",
          blob: file,
          durationSeconds: null,
        },
      ]);
    }
    event.target.value = "";
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!auth.user) return;
    setSaving(true);
    setFormError(null);
    setMessage(null);

    const input: CreateDailyReportRequest = {
      id: crypto.randomUUID(),
      subjectId: form.subjectId,
      catalogueItemId: form.catalogueItemId || null,
      chapterId: null,
      lessonDate: form.lessonDate,
      title: form.title,
      originalSummary: form.originalSummary,
      understoodPoints: form.understoodPoints || null,
      questions: form.questions || null,
      status: "saved",
    };

    try {
      if (personalDevice) {
        const local = await stageDailyReport(auth.user.id, input, attachments);
        setReports((current) => [local, ...current.filter((report) => report.id !== local.id)]);
        try {
          const serverReport = await createDailyReport(input);
          await markDailyReportSynced(serverReport);
          setReports((current) => [
            serverReport,
            ...current.filter((report) => report.id !== serverReport.id),
          ]);
          const mediaFailures = await transferAttachments(input.id, attachments, true);
          setMessage(
            mediaFailures > 0
              ? "Bilan synchronisé. Certains médias restent sur cet appareil et seront renvoyés à la reconnexion."
              : attachments.length > 0
                ? "Bilan, photos et audio enregistrés et synchronisés."
                : "Bilan enregistré et synchronisé.",
          );
        } catch (error) {
          await markDailyReportSyncFailed(
            input.id,
            error instanceof Error ? error.message : "Synchronisation impossible.",
          );
          setMessage("Bilan sauvegardé sur cet appareil. Il sera synchronisé à la reconnexion.");
        }
      } else {
        const serverReport = await createDailyReport(input);
        setReports((current) => [
          serverReport,
          ...current.filter((report) => report.id !== serverReport.id),
        ]);
        const mediaFailures = await transferAttachments(input.id, attachments, false);
        setMessage(
          mediaFailures > 0
            ? "Bilan enregistré, mais certains médias n'ont pas pu être transférés depuis cet appareil partagé."
            : attachments.length > 0
              ? "Bilan et médias enregistrés. Aucune copie privée ne reste sur cet appareil partagé."
              : "Bilan enregistré.",
        );
      }
      setForm(emptyForm(form.subjectId));
      setAttachments([]);
      setFormOpen(false);
    } catch (error) {
      setFormError(
        error instanceof ApiClientError ? error.message : "Le bilan n'a pas pu être enregistré.",
      );
    } finally {
      setSaving(false);
    }
  }

  function applyDraft(draft: CourseDraft) {
    setCourseDraft(draft);
    setActiveReport((current) =>
      current?.id === draft.reportId ? { ...current, enrichmentStatus: draft.status } : current,
    );
    setReports((current) =>
      current.map((report) =>
        report.id === draft.reportId ? { ...report, enrichmentStatus: draft.status } : report,
      ),
    );
  }

  async function openCourseDraft(report: ReportView) {
    setActiveReport(report);
    setCourseDraft(null);
    setDraftError(null);
    if (auth.offline) {
      const cached =
        personalDevice && auth.user ? await readCachedCourseDraft(auth.user.id, report.id) : null;
      if (cached) {
        applyDraft(cached);
      } else {
        setDraftError(
          "La structuration et la vérification nécessitent une connexion. Le bilan original reste disponible hors ligne.",
        );
      }
      return;
    }
    if ("syncStatus" in report && report.syncStatus !== "synced") {
      setDraftError("Synchronisez d'abord ce bilan avant de préparer son cours structuré.");
      return;
    }

    setDraftLoading(true);
    try {
      let draft: CourseDraft;
      if (report.enrichmentStatus === "not_requested" || report.enrichmentStatus === "failed") {
        draft = await generateCourseDraft(report.id);
      } else {
        try {
          draft = await getCourseDraft(report.id);
        } catch (error) {
          if (!(error instanceof ApiClientError) || error.status !== 404) throw error;
          draft = await generateCourseDraft(report.id);
        }
      }
      applyDraft(draft);
      if (personalDevice && auth.user) void cacheCourseDraft(auth.user.id, draft);
    } catch (error) {
      setDraftError(
        error instanceof ApiClientError
          ? error.message
          : "Le brouillon n'a pas pu être préparé. Le bilan original reste intact.",
      );
    } finally {
      setDraftLoading(false);
    }
  }

  async function decideCorrection(
    correctionId: string,
    reviewStatus: ReviewDraftCorrectionRequest["reviewStatus"],
  ) {
    if (!activeReport) return;
    setDraftLoading(true);
    setDraftError(null);
    try {
      const draft = await reviewDraftCorrection(activeReport.id, correctionId, { reviewStatus });
      applyDraft(draft);
      if (personalDevice && auth.user) void cacheCourseDraft(auth.user.id, draft);
    } catch (error) {
      setDraftError(
        error instanceof ApiClientError
          ? error.message
          : "La décision n'a pas pu être enregistrée.",
      );
    } finally {
      setDraftLoading(false);
    }
  }

  async function refreshCourseDraft() {
    if (!activeReport) return;
    if (auth.offline) {
      setDraftError(
        "Une connexion est nécessaire pour rechercher une fiche approuvée plus récente.",
      );
      return;
    }
    setDraftLoading(true);
    setDraftError(null);
    try {
      const previousId = courseDraft?.id;
      const draft = await generateCourseDraft(activeReport.id, true);
      applyDraft(draft);
      if (personalDevice && auth.user) void cacheCourseDraft(auth.user.id, draft);
      setMessage(
        draft.id === previousId
          ? "Le brouillon utilise déjà la version la plus récente du corpus."
          : draft.provider === "curated-corpus"
            ? "Une fiche approuvée plus récente a été appliquée. Vérifiez le nouveau brouillon."
            : "Aucune fiche approuvée n'est encore publiée pour ce thème.",
      );
    } catch (error) {
      setDraftError(
        error instanceof ApiClientError ? error.message : "Le corpus n'a pas pu être actualisé.",
      );
    } finally {
      setDraftLoading(false);
    }
  }

  async function validateCourseDraft() {
    if (!activeReport) return;
    setDraftLoading(true);
    setDraftError(null);
    try {
      const draft = await acceptCourseDraft(activeReport.id);
      applyDraft(draft);
      if (personalDevice && auth.user) void cacheCourseDraft(auth.user.id, draft);
      setMessage(
        "Le brouillon a été validé comme cours personnel. Le bilan original reste conservé.",
      );
    } catch (error) {
      setDraftError(
        error instanceof ApiClientError ? error.message : "Le brouillon n'a pas pu être validé.",
      );
    } finally {
      setDraftLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="page-heading resources-heading">
        <div>
          <p className="ui-eyebrow">Votre classeur progressif</p>
          <h1>Ressources</h1>
          <p>
            Retrouvez la trame du programme et ajoutez chaque jour ce qui a réellement été étudié en
            classe.
          </p>
        </div>
        {auth.user?.role === "student" && (
          <button className="primary-action fit" type="button" onClick={() => openForm()}>
            + Nouveau bilan
          </button>
        )}
      </div>

      {message && (
        <div className="success-alert page-alert" role="status">
          {message}
        </div>
      )}
      {loadError && (
        <div className="form-alert page-alert" role="alert">
          {loadError}
        </div>
      )}

      {catalogue && (
        <div className="catalogue-overview">
          <article>
            <strong>{catalogue.subjects.length}</strong>
            <span>Matières</span>
          </article>
          <article>
            <strong>
              {catalogue.subjects.reduce((total, subject) => total + subject.items.length, 0)}
            </strong>
            <span>Thèmes visibles</span>
          </article>
          <article>
            <strong>Série {catalogue.series.code}</strong>
            <span>Catalogue de travail</span>
          </article>
        </div>
      )}

      {catalogue && (
        <div className="catalogue-notice" role="note">
          <span aria-hidden="true">i</span>
          <div>
            <strong>Référentiel progressif</strong>
            <p>{catalogue.notice}</p>
          </div>
        </div>
      )}

      {formOpen && catalogue && (
        <section
          className="panel-card daily-report-form-panel"
          aria-labelledby="daily-report-title"
        >
          <div className="panel-heading">
            <div>
              <p className="ui-eyebrow">Après le cours</p>
              <h2 id="daily-report-title">Mon bilan du jour</h2>
            </div>
            <button className="text-action" type="button" onClick={() => setFormOpen(false)}>
              Fermer
            </button>
          </div>
          <form className="daily-report-form" onSubmit={(event) => void submit(event)}>
            {formError && (
              <div className="form-alert form-wide" role="alert">
                {formError}
              </div>
            )}
            <label>
              Date du cours
              <input
                type="date"
                value={form.lessonDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lessonDate: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Matière
              <select
                value={form.subjectId}
                onChange={(event) => selectFormSubject(event.target.value)}
                required
              >
                {catalogue.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-wide">
              Thème du catalogue <small>(facultatif)</small>
              <select
                value={form.catalogueItemId}
                onChange={(event) => selectFormItem(event.target.value)}
              >
                <option value="">Autre thème étudié en classe</option>
                {formItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.section} · {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-wide">
              Titre
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                maxLength={240}
                placeholder="Ex. Introduction à la fonction logarithme"
                required
              />
            </label>
            <label className="form-wide">
              Ce que j'ai noté ou retenu
              <textarea
                value={form.originalSummary}
                onChange={(event) =>
                  setForm((current) => ({ ...current, originalSummary: event.target.value }))
                }
                maxLength={20_000}
                rows={6}
                placeholder="Écrivez avec vos mots. Votre texte original sera toujours conservé."
                required
              />
            </label>
            <label>
              Ce que j'ai compris <small>(facultatif)</small>
              <textarea
                value={form.understoodPoints}
                onChange={(event) =>
                  setForm((current) => ({ ...current, understoodPoints: event.target.value }))
                }
                maxLength={10_000}
                rows={4}
              />
            </label>
            <label>
              Mes questions <small>(facultatif)</small>
              <textarea
                value={form.questions}
                onChange={(event) =>
                  setForm((current) => ({ ...current, questions: event.target.value }))
                }
                maxLength={10_000}
                rows={4}
              />
            </label>

            <fieldset
              className="form-wide media-fieldset"
              disabled={!personalDevice && auth.offline}
            >
              <legend>Ajouter depuis le téléphone</legend>
              <div className="media-actions">
                <label className="media-picker">
                  <span aria-hidden="true">▧</span>
                  <strong>Photo du cahier</strong>
                  <small>2 photos · 5 Mo chacune</small>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    multiple
                    onChange={addPhotos}
                  />
                </label>
                <label className="media-picker">
                  <span aria-hidden="true">●</span>
                  <strong>Audio court</strong>
                  <small>1 fichier · 10 Mo maximum</small>
                  <input type="file" accept="audio/*" capture onChange={addAudio} />
                </label>
              </div>
              {!personalDevice && (
                <p className="shared-media-warning">
                  Sur un appareil partagé, les médias sont envoyés immédiatement et aucune copie
                  privée n'est gardée après l'envoi.
                </p>
              )}
              {attachments.length > 0 && (
                <ul className="attachment-list">
                  {attachments.map((attachment) => (
                    <li key={attachment.id}>
                      <span>{attachment.kind === "image" ? "Photo" : "Audio"}</span>
                      <strong>{attachment.name}</strong>
                      <small>{(attachment.blob.size / 1024 / 1024).toFixed(1)} Mo</small>
                      <button
                        type="button"
                        onClick={() =>
                          setAttachments((current) =>
                            current.filter((candidate) => candidate.id !== attachment.id),
                          )
                        }
                        aria-label={`Retirer ${attachment.name}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
            <div className="form-wide form-submit-row">
              <p>
                L'enrichissement automatique arrivera ensuite. Aucune correction ne remplacera vos
                notes sans votre accord.
              </p>
              <button className="primary-action fit" type="submit" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer mon bilan"}
              </button>
            </div>
          </form>
        </section>
      )}

      {activeReport && (
        <section className="panel-card course-workspace" aria-labelledby="course-workspace-title">
          <div className="panel-heading course-workspace-heading">
            <div>
              <p className="ui-eyebrow">Du bilan au cours personnel</p>
              <h2 id="course-workspace-title">{activeReport.title}</h2>
            </div>
            <button
              className="text-action"
              type="button"
              onClick={() => {
                setActiveReport(null);
                setCourseDraft(null);
                setDraftError(null);
              }}
            >
              Fermer
            </button>
          </div>

          {draftError && (
            <div className="form-alert" role="alert">
              {draftError}
            </div>
          )}
          {draftLoading && !courseDraft && (
            <div className="draft-loading" role="status">
              Préparation du brouillon structuré…
            </div>
          )}

          <div className="course-workspace-grid">
            <article className="original-report-panel">
              <div className="content-panel-title">
                <span className="content-origin original">Original conservé</span>
                <h3>Bilan saisi par l'élève</h3>
              </div>
              <p className="content-copy">{activeReport.originalSummary}</p>
              {activeReport.understoodPoints && (
                <div className="original-extra">
                  <strong>Ce qui était compris</strong>
                  <p>{activeReport.understoodPoints}</p>
                </div>
              )}
              {activeReport.questions && (
                <div className="original-extra">
                  <strong>Questions notées</strong>
                  <p>{activeReport.questions}</p>
                </div>
              )}
              <p className="immutable-note">
                Ce texte n'est jamais remplacé par le brouillon ou par une correction.
              </p>
            </article>

            {courseDraft?.content && (
              <article className="structured-course-panel">
                <div className="content-panel-title">
                  <span className={`content-origin ${courseDraft.status}`}>
                    {courseDraft.status === "accepted" ? "Cours validé" : "Brouillon à vérifier"}
                  </span>
                  <h3>Cours structuré</h3>
                </div>
                {courseDraft.provider === "local-outline" && (
                  <div className="catalogue-notice compact" role="note">
                    <span aria-hidden="true">i</span>
                    <p>
                      Mode local gratuit : le bilan est organisé sans vérification factuelle, OCR,
                      transcription ni ajout d'informations externes.
                    </p>
                  </div>
                )}
                {courseDraft.provider === "curated-corpus" && (
                  <div className="catalogue-notice compact verified" role="note">
                    <span aria-hidden="true">✓</span>
                    <p>
                      Ce brouillon utilise une fiche publiée par l'administration. Les corrections
                      automatiques restent limitées aux expressions explicitement prévues dans cette
                      fiche et doivent être confirmées ci-dessous.
                    </p>
                  </div>
                )}

                <section className="draft-section">
                  <h4>Objectifs de travail</h4>
                  <ul>
                    {courseDraft.content.objectives.map((objective) => (
                      <li key={objective}>{objective}</li>
                    ))}
                  </ul>
                </section>
                <section className="draft-section">
                  <h4>Synthèse de travail</h4>
                  <p className="content-copy">{courseDraft.content.synthesis}</p>
                </section>
                {courseDraft.content.definitions.length > 0 && (
                  <section className="draft-section">
                    <h4>Définitions proposées</h4>
                    <dl>
                      {courseDraft.content.definitions.map((definition) => (
                        <div key={definition.term}>
                          <dt>{definition.term}</dt>
                          <dd>{definition.explanation}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}
                {courseDraft.content.explanations.length > 0 && (
                  <section className="draft-section">
                    <h4>Explications ajoutées</h4>
                    <ul>
                      {courseDraft.content.explanations.map((explanation) => (
                        <li key={explanation}>{explanation}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {courseDraft.content.examples.length > 0 && (
                  <section className="draft-section">
                    <h4>Exemples proposés</h4>
                    <ul>
                      {courseDraft.content.examples.map((example) => (
                        <li key={example}>{example}</li>
                      ))}
                    </ul>
                  </section>
                )}
                <section className="draft-section unresolved-section">
                  <h4>Points à vérifier</h4>
                  <ul>
                    {courseDraft.content.unresolvedPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </section>
              </article>
            )}
          </div>

          {courseDraft && (
            <div className="draft-review-area">
              <section className="corrections-panel" aria-labelledby="corrections-title">
                <div className="review-section-heading">
                  <div>
                    <p className="ui-eyebrow">Aucune réécriture silencieuse</p>
                    <h3 id="corrections-title">Corrections proposées</h3>
                  </div>
                  <span>{courseDraft.corrections.length}</span>
                </div>
                {courseDraft.corrections.length === 0 ? (
                  <p className="review-empty">
                    Le fournisseur actuel ne propose aucune correction factuelle. Cela ne signifie
                    pas que le bilan a été vérifié.
                  </p>
                ) : (
                  <ol className="correction-list">
                    {courseDraft.corrections.map((correction) => (
                      <li key={correction.id}>
                        <div className="correction-status-row">
                          <span className={`correction-status ${correction.reviewStatus}`}>
                            {correctionStatusLabel(correction.reviewStatus)}
                          </span>
                        </div>
                        <div className="correction-comparison">
                          <div>
                            <small>Extrait original</small>
                            <p>{correction.originalExcerpt}</p>
                          </div>
                          <div>
                            <small>Proposition</small>
                            <p>{correction.proposedText}</p>
                          </div>
                        </div>
                        <p className="correction-explanation">
                          <strong>Pourquoi ?</strong> {correction.explanation}
                        </p>
                        {correction.citations.length > 0 && (
                          <p className="correction-source">
                            Source :{" "}
                            {correction.citations.map((citation) => citation.title).join(", ")}
                          </p>
                        )}
                        {courseDraft.status !== "accepted" && (
                          <div className="correction-actions">
                            <button
                              className={correction.reviewStatus === "accepted" ? "selected" : ""}
                              type="button"
                              disabled={draftLoading}
                              onClick={() => void decideCorrection(correction.id, "accepted")}
                            >
                              Accepter
                            </button>
                            <button
                              className={correction.reviewStatus === "rejected" ? "selected" : ""}
                              type="button"
                              disabled={draftLoading}
                              onClick={() => void decideCorrection(correction.id, "rejected")}
                            >
                              Refuser
                            </button>
                            <button
                              className={
                                correction.reviewStatus === "ask_teacher" ? "selected" : ""
                              }
                              type="button"
                              disabled={draftLoading}
                              onClick={() => void decideCorrection(correction.id, "ask_teacher")}
                            >
                              Demander au professeur
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="draft-sources" aria-labelledby="draft-sources-title">
                <div className="review-section-heading">
                  <div>
                    <p className="ui-eyebrow">Traçabilité</p>
                    <h3 id="draft-sources-title">Sources consultées</h3>
                  </div>
                  <span>{courseDraft.citations.length}</span>
                </div>
                {courseDraft.citations.length === 0 ? (
                  <p className="review-empty">
                    Aucune source factuelle n'a encore été consultée pour ce brouillon.
                  </p>
                ) : (
                  <ol>
                    {courseDraft.citations.map((citation) => (
                      <li key={citation.id}>
                        <span className={`source-tier ${citation.trustTier}`}>
                          {sourceTierLabel(citation.trustTier)}
                        </span>
                        <strong>{citation.title}</strong>
                        {citation.publisher && <small>{citation.publisher}</small>}
                        {citation.excerpt && <p>{citation.excerpt}</p>}
                        {citation.url && (
                          <a href={citation.url} target="_blank" rel="noreferrer">
                            Consulter la source
                          </a>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          )}

          {courseDraft && (
            <div className="draft-validation-bar">
              <p>
                {courseDraft.status === "accepted"
                  ? "Ce brouillon est validé comme cours personnel. L'original reste consultable à côté."
                  : "Validez uniquement après avoir lu le brouillon et traité chaque correction proposée."}
              </p>
              <div className="draft-validation-actions">
                <button
                  className="secondary-action"
                  type="button"
                  disabled={draftLoading}
                  onClick={() => void refreshCourseDraft()}
                >
                  {courseDraft.provider === "local-outline"
                    ? "Rechercher une fiche approuvée"
                    : "Actualiser depuis le corpus"}
                </button>
                {courseDraft.status !== "accepted" && (
                  <button
                    className="primary-action fit"
                    type="button"
                    disabled={
                      draftLoading ||
                      courseDraft.corrections.some(
                        (correction) => correction.reviewStatus === "proposed",
                      )
                    }
                    onClick={() => void validateCourseDraft()}
                  >
                    {draftLoading ? "Enregistrement…" : "Valider comme cours personnel"}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="resources-layout">
        <section className="catalogue-panel">
          <div className="subject-tabs" role="tablist" aria-label="Matières">
            {catalogue?.subjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                role="tab"
                aria-selected={subject.id === selectedSubjectId}
                className={subject.id === selectedSubjectId ? "active" : ""}
                onClick={() => setSelectedSubjectId(subject.id)}
              >
                <span>{subject.name}</span>
                <small>{subject.items.length}</small>
              </button>
            ))}
          </div>

          <div className="catalogue-toolbar">
            <div>
              <p className="ui-eyebrow">{selectedSubject?.name ?? "Catalogue"}</p>
              <h2>{filteredItems.length} thèmes disponibles</h2>
            </div>
            <label className="catalogue-search">
              <span className="sr-only">Rechercher un thème</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un thème…"
              />
            </label>
          </div>

          {loading && <div className="panel-card empty-state">Chargement du catalogue…</div>}
          {!loading && groupedItems.length === 0 && (
            <div className="panel-card empty-state">
              Aucun thème ne correspond à cette recherche.
            </div>
          )}
          <div className="catalogue-groups">
            {groupedItems.map(([section, items]) => (
              <section key={section} className="panel-card catalogue-group">
                <div className="catalogue-group-heading">
                  <h3>{section}</h3>
                  <span>{items.length}</span>
                </div>
                <ol>
                  {items.map((item) => (
                    <li key={item.id}>
                      <div>
                        <strong>{item.title}</strong>
                        <span
                          className={`catalogue-status ${
                            item.seriesDScope === "explicitly_includes" ? "included" : "pending"
                          }`}
                        >
                          {item.seriesDScope === "explicitly_includes"
                            ? "Série D indiquée"
                            : "Compatibilité à confirmer"}
                        </span>
                      </div>
                      <div className="catalogue-item-actions">
                        <a href={item.sourceUrl ?? "#"} target="_blank" rel="noreferrer">
                          Source
                        </a>
                        {auth.user?.role === "student" && (
                          <button type="button" onClick={() => openForm(item)}>
                            Ajouter mon bilan
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </section>

        <aside className="panel-card recent-reports">
          <div className="panel-heading">
            <div>
              <p className="ui-eyebrow">Votre progression</p>
              <h2>Bilans récents</h2>
            </div>
            <span>{reports.length}</span>
          </div>
          {reports.length === 0 ? (
            <div className="reports-empty">
              <span aria-hidden="true">✎</span>
              <strong>Commencez après votre prochain cours</strong>
              <p>Quelques lignes suffisent. Vous pourrez les compléter plus tard.</p>
            </div>
          ) : (
            <ol>
              {reports.slice(0, 6).map((report) => {
                const subject = catalogue?.subjects.find(
                  (candidate) => candidate.id === report.subjectId,
                );
                const local = "syncStatus" in report ? report : null;
                return (
                  <li key={report.id}>
                    <div>
                      <span>{subject?.name ?? "Matière"}</span>
                      <time dateTime={report.lessonDate}>
                        {new Intl.DateTimeFormat("fr-BF", {
                          day: "numeric",
                          month: "short",
                        }).format(new Date(`${report.lessonDate}T12:00:00`))}
                      </time>
                    </div>
                    <strong>{report.title}</strong>
                    <small className={local?.syncStatus === "synced" ? "synced" : "pending"}>
                      {local?.syncStatus === "synced" || !local
                        ? "Synchronisé"
                        : "En attente de synchronisation"}
                    </small>
                    <button
                      className="report-draft-action"
                      type="button"
                      onClick={() => void openCourseDraft(report)}
                    >
                      {report.enrichmentStatus === "accepted"
                        ? "Voir le cours validé"
                        : report.enrichmentStatus === "needs_review"
                          ? "Continuer la vérification"
                          : "Structurer ce cours"}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
