import type {
  CreateDailyReportRequest,
  DailyReport,
  DailyReportAttachment,
  DailyReportAttachmentKind,
} from "@bac-2027/contracts";

import {
  offlineDatabase,
  type LocalDailyReport,
  type LocalDailyReportAttachment,
} from "./database";
import { createOutboxOperation } from "./outbox";

export interface LocalAttachmentInput {
  id: string;
  kind: DailyReportAttachmentKind;
  name: string;
  mimeType: string;
  blob: Blob;
  durationSeconds: number | null;
}

function requestFromLocal(report: LocalDailyReport): CreateDailyReportRequest {
  return {
    id: report.id,
    subjectId: report.subjectId,
    catalogueItemId: report.catalogueItemId,
    chapterId: report.chapterId,
    lessonDate: report.lessonDate,
    title: report.title,
    originalSummary: report.originalSummary,
    understoodPoints: report.understoodPoints,
    questions: report.questions,
    status: report.status === "draft" ? "draft" : "saved",
  };
}

function localFromServer(report: DailyReport): LocalDailyReport {
  return {
    ...report,
    serverVersion: report.version,
    syncStatus: "synced",
    deletedAt: null,
  };
}

export async function stageDailyReport(
  studentId: string,
  input: CreateDailyReportRequest,
  attachments: LocalAttachmentInput[],
): Promise<LocalDailyReport> {
  const now = new Date().toISOString();
  const report: LocalDailyReport = {
    ...input,
    studentId,
    enrichmentStatus: "not_requested",
    serverVersion: null,
    syncStatus: "pending",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const localAttachments: LocalDailyReportAttachment[] = attachments.map((attachment) => ({
    id: attachment.id,
    reportId: input.id,
    kind: attachment.kind,
    originalName: attachment.name,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.blob.size,
    localBlob: attachment.blob,
    durationSeconds: attachment.durationSeconds,
    checksumSha256: null,
    contentPath: null,
    processingStatus: "stored",
    syncStatus: "pending",
    createdAt: now,
    deletedAt: null,
  }));
  const operation = createOutboxOperation({
    entityType: "dailyReport",
    entityId: input.id,
    kind: "create",
    baseVersion: null,
    payload: input,
  });

  await offlineDatabase.transaction(
    "rw",
    [offlineDatabase.dailyReports, offlineDatabase.dailyReportAttachments, offlineDatabase.outbox],
    async () => {
      await offlineDatabase.dailyReports.put(report);
      if (localAttachments.length > 0) {
        await offlineDatabase.dailyReportAttachments.bulkPut(localAttachments);
      }
      await offlineDatabase.outbox.put(operation);
    },
  );
  return report;
}

export async function storeServerDailyReports(reports: DailyReport[]): Promise<void> {
  if (reports.length === 0) return;
  await offlineDatabase.dailyReports.bulkPut(reports.map(localFromServer));
}

export async function listLocalDailyReports(studentId: string): Promise<LocalDailyReport[]> {
  const reports = await offlineDatabase.dailyReports
    .where("studentId")
    .equals(studentId)
    .filter((report) => report.deletedAt === null)
    .toArray();
  return reports.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function markDailyReportSynced(report: DailyReport): Promise<void> {
  await offlineDatabase.transaction(
    "rw",
    [offlineDatabase.dailyReports, offlineDatabase.outbox],
    async () => {
      await offlineDatabase.dailyReports.put(localFromServer(report));
      const operations = await offlineDatabase.outbox
        .where("entityId")
        .equals(report.id)
        .filter((operation) => operation.entityType === "dailyReport")
        .primaryKeys();
      await offlineDatabase.outbox.bulkDelete(operations);
    },
  );
}

export async function markDailyReportSyncFailed(reportId: string, message: string): Promise<void> {
  await offlineDatabase.dailyReports.update(reportId, { syncStatus: "failed" });
  const operations = await offlineDatabase.outbox
    .where("entityId")
    .equals(reportId)
    .filter((operation) => operation.entityType === "dailyReport")
    .toArray();
  await Promise.all(
    operations.map((operation) =>
      offlineDatabase.outbox.update(operation.operationId, {
        status: "failed",
        lastError: message,
        attemptCount: operation.attemptCount + 1,
      }),
    ),
  );
}

export async function pendingDailyReports(studentId: string): Promise<CreateDailyReportRequest[]> {
  const reports = await offlineDatabase.dailyReports
    .where("studentId")
    .equals(studentId)
    .filter(
      (report) =>
        report.deletedAt === null &&
        (report.syncStatus === "pending" || report.syncStatus === "failed"),
    )
    .toArray();
  return reports.map(requestFromLocal);
}

export async function pendingDailyReportAttachments(
  studentId: string,
): Promise<LocalDailyReportAttachment[]> {
  const reportIds = new Set(
    (
      await offlineDatabase.dailyReports
        .where("studentId")
        .equals(studentId)
        .filter((report) => report.deletedAt === null)
        .primaryKeys()
    ).map(String),
  );
  return offlineDatabase.dailyReportAttachments
    .filter(
      (attachment) =>
        reportIds.has(attachment.reportId) &&
        attachment.deletedAt === null &&
        attachment.localBlob !== null &&
        (attachment.syncStatus === "pending" || attachment.syncStatus === "failed"),
    )
    .toArray();
}

export async function markDailyReportAttachmentSynced(
  attachment: DailyReportAttachment,
): Promise<void> {
  await offlineDatabase.dailyReportAttachments.update(attachment.id, {
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    durationSeconds: attachment.durationSeconds,
    checksumSha256: attachment.checksumSha256,
    contentPath: attachment.contentPath,
    processingStatus: attachment.processingStatus,
    syncStatus: "synced",
  });
}

export async function markDailyReportAttachmentSyncFailed(attachmentId: string): Promise<void> {
  await offlineDatabase.dailyReportAttachments.update(attachmentId, { syncStatus: "failed" });
}

export async function listLocalDailyReportAttachments(
  reportId: string,
): Promise<LocalDailyReportAttachment[]> {
  return offlineDatabase.dailyReportAttachments
    .where("reportId")
    .equals(reportId)
    .filter((attachment) => attachment.deletedAt === null)
    .sortBy("createdAt");
}
