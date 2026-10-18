import Dexie, { type EntityTable } from "dexie";

import type {
  AttachmentProcessingStatus,
  CourseDraft,
  CurrentUser,
  DailyReportAttachmentKind,
  DailyReportStatus,
  DeviceType,
  EnrichmentStatus,
  MutationKind,
  ProfilePreferences,
  RevisionOverview,
  StudentCatalogueResponse,
  SyncEntityType,
} from "@bac-2027/contracts";

export type LocalSyncStatus = "synced" | "pending" | "syncing" | "failed" | "conflict";

export interface LocalResource {
  id: string;
  ownerId: string;
  subjectId: string | null;
  chapterId: string | null;
  title: string;
  kind: "note" | "document" | "image" | "audio" | "video";
  noteContent: string | null;
  serverVersion: number | null;
  syncStatus: LocalSyncStatus;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LocalDailyReport {
  id: string;
  studentId: string;
  subjectId: string;
  catalogueItemId: string | null;
  chapterId: string | null;
  lessonDate: string;
  title: string;
  originalSummary: string;
  understoodPoints: string | null;
  questions: string | null;
  status: DailyReportStatus;
  enrichmentStatus: EnrichmentStatus;
  serverVersion: number | null;
  syncStatus: LocalSyncStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LocalDailyReportAttachment {
  id: string;
  reportId: string;
  kind: DailyReportAttachmentKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  localBlob: Blob | null;
  durationSeconds: number | null;
  checksumSha256: string | null;
  contentPath: string | null;
  processingStatus: AttachmentProcessingStatus;
  syncStatus: LocalSyncStatus;
  createdAt: string;
  deletedAt: string | null;
}

export interface LocalRevisionSession {
  id: string;
  studentId: string;
  subjectId: string | null;
  subjectName: string | null;
  catalogueItemId: string | null;
  catalogueItemTitle: string | null;
  title: string;
  notes: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: "planned" | "completed" | "cancelled";
  completedAt: string | null;
  serverVersion: number | null;
  syncStatus: LocalSyncStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LocalQuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  status: "in_progress" | "submitted" | "abandoned";
  answers: Record<string, string[]>;
  serverVersion: number | null;
  syncStatus: LocalSyncStatus;
  updatedAt: string;
}

export interface OutboxOperation {
  operationId: string;
  entityType: SyncEntityType;
  entityId: string;
  kind: MutationKind;
  baseVersion: number | null;
  payload: Record<string, unknown>;
  createdAt: string;
  attemptCount: number;
  nextAttemptAt: string;
  status: Exclude<LocalSyncStatus, "synced">;
  lastError: string | null;
}

export interface SyncMetadata {
  key: "state";
  deviceId: string;
  lastCursor: number;
  lastSuccessfulSyncAt: string | null;
}

export interface CachedAuthentication {
  key: "current";
  user: CurrentUser;
  preferences: ProfilePreferences;
  deviceType: DeviceType;
  expiresAt: string;
}

export interface CachedCatalogue {
  key: string;
  catalogue: StudentCatalogueResponse;
  cachedAt: string;
}

export interface CachedCourseDraft {
  id: string;
  reportId: string;
  studentId: string;
  draft: CourseDraft;
  cachedAt: string;
}

export interface CachedRevisionOverview {
  studentId: string;
  overview: RevisionOverview;
  cachedAt: string;
}

export class OfflineDatabase extends Dexie {
  resources!: EntityTable<LocalResource, "id">;
  dailyReports!: EntityTable<LocalDailyReport, "id">;
  dailyReportAttachments!: EntityTable<LocalDailyReportAttachment, "id">;
  revisionSessions!: EntityTable<LocalRevisionSession, "id">;
  quizAttempts!: EntityTable<LocalQuizAttempt, "id">;
  outbox!: EntityTable<OutboxOperation, "operationId">;
  syncMetadata!: EntityTable<SyncMetadata, "key">;
  authCache!: EntityTable<CachedAuthentication, "key">;
  catalogueCache!: EntityTable<CachedCatalogue, "key">;
  courseDrafts!: EntityTable<CachedCourseDraft, "id">;
  revisionOverviews!: EntityTable<CachedRevisionOverview, "studentId">;

  constructor(name = "bac-2027") {
    super(name);

    const stores = {
      resources: "id, ownerId, subjectId, syncStatus, updatedAt, deletedAt",
      revisionSessions: "id, studentId, subjectId, status, syncStatus, scheduledAt, deletedAt",
      quizAttempts: "id, quizId, studentId, status, syncStatus, updatedAt",
      outbox:
        "operationId, status, entityType, entityId, createdAt, nextAttemptAt, [status+nextAttemptAt]",
      syncMetadata: "key",
    };
    this.version(1).stores(stores);
    this.version(2).stores({ ...stores, authCache: "key" });
    const learningStores = {
      ...stores,
      authCache: "key",
      dailyReports:
        "id, studentId, subjectId, catalogueItemId, lessonDate, status, enrichmentStatus, syncStatus, updatedAt, deletedAt",
      dailyReportAttachments:
        "id, reportId, kind, processingStatus, syncStatus, createdAt, deletedAt",
    };
    this.version(3).stores(learningStores);
    this.version(4).stores({ ...learningStores, catalogueCache: "key, cachedAt" });
    this.version(5).stores({
      ...learningStores,
      catalogueCache: "key, cachedAt",
      courseDrafts: "id, reportId, studentId, cachedAt, [studentId+reportId]",
    });
    this.version(6).stores({
      ...learningStores,
      catalogueCache: "key, cachedAt",
      courseDrafts: "id, reportId, studentId, cachedAt, [studentId+reportId]",
      revisionOverviews: "studentId, cachedAt",
    });
    this.version(7).stores({
      ...learningStores,
      revisionSessions:
        "id, studentId, subjectId, catalogueItemId, status, syncStatus, scheduledAt, deletedAt, [studentId+scheduledAt]",
      catalogueCache: "key, cachedAt",
      courseDrafts: "id, reportId, studentId, cachedAt, [studentId+reportId]",
      revisionOverviews: "studentId, cachedAt",
    });
  }
}

export const offlineDatabase = new OfflineDatabase();

export async function cacheAuthentication(authentication: CachedAuthentication): Promise<void> {
  await offlineDatabase.authCache.put(authentication);
}

export async function readCachedAuthentication(): Promise<CachedAuthentication | null> {
  const cached = await offlineDatabase.authCache.get("current");
  if (!cached || new Date(cached.expiresAt).getTime() <= Date.now()) {
    await offlineDatabase.authCache.delete("current");
    return null;
  }
  return cached;
}

export async function clearAuthenticationCache(): Promise<void> {
  await offlineDatabase.authCache.delete("current");
}

export async function cacheCatalogue(catalogue: StudentCatalogueResponse): Promise<void> {
  await offlineDatabase.catalogueCache.put({
    key: `series-${catalogue.series.code}`,
    catalogue,
    cachedAt: new Date().toISOString(),
  });
}

export async function readCachedCatalogue(
  seriesCode: string,
): Promise<StudentCatalogueResponse | null> {
  return (await offlineDatabase.catalogueCache.get(`series-${seriesCode}`))?.catalogue ?? null;
}

export async function cacheCourseDraft(studentId: string, draft: CourseDraft): Promise<void> {
  await offlineDatabase.transaction("rw", offlineDatabase.courseDrafts, async () => {
    const previousIds = await offlineDatabase.courseDrafts
      .where("[studentId+reportId]")
      .equals([studentId, draft.reportId])
      .primaryKeys();
    await offlineDatabase.courseDrafts.bulkDelete(previousIds);
    await offlineDatabase.courseDrafts.put({
      id: draft.id,
      reportId: draft.reportId,
      studentId,
      draft,
      cachedAt: new Date().toISOString(),
    });
  });
}

export async function readCachedCourseDraft(
  studentId: string,
  reportId: string,
): Promise<CourseDraft | null> {
  const cached = await offlineDatabase.courseDrafts
    .where("[studentId+reportId]")
    .equals([studentId, reportId])
    .first();
  return cached?.draft ?? null;
}

export async function cacheRevisionOverview(
  studentId: string,
  overview: RevisionOverview,
): Promise<void> {
  await offlineDatabase.revisionOverviews.put({
    studentId,
    overview,
    cachedAt: new Date().toISOString(),
  });
}

export async function readCachedRevisionOverview(
  studentId: string,
): Promise<RevisionOverview | null> {
  return (await offlineDatabase.revisionOverviews.get(studentId))?.overview ?? null;
}

export async function clearPrivateOfflineData(): Promise<void> {
  await offlineDatabase.transaction(
    "rw",
    [
      offlineDatabase.resources,
      offlineDatabase.dailyReports,
      offlineDatabase.dailyReportAttachments,
      offlineDatabase.revisionSessions,
      offlineDatabase.quizAttempts,
      offlineDatabase.outbox,
      offlineDatabase.syncMetadata,
      offlineDatabase.authCache,
      offlineDatabase.courseDrafts,
      offlineDatabase.revisionOverviews,
    ],
    async () => {
      await Promise.all([
        offlineDatabase.resources.clear(),
        offlineDatabase.dailyReports.clear(),
        offlineDatabase.dailyReportAttachments.clear(),
        offlineDatabase.revisionSessions.clear(),
        offlineDatabase.quizAttempts.clear(),
        offlineDatabase.outbox.clear(),
        offlineDatabase.syncMetadata.clear(),
        offlineDatabase.authCache.clear(),
        offlineDatabase.courseDrafts.clear(),
        offlineDatabase.revisionOverviews.clear(),
      ]);
    },
  );
}
