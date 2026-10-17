import { and, asc, eq, isNull, sql } from "drizzle-orm";

import type { DailyReportAttachmentKind } from "@bac-2027/contracts";

import type { AppDatabase } from "../../db/client";
import {
  dailyReportAttachments,
  dailyReports,
  resourceFiles,
  resources,
  users,
} from "../../db/schema";

export interface AttachmentRecord {
  id: string;
  reportId: string;
  kind: DailyReportAttachmentKind;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  durationSeconds: number | null;
  processingStatus: "stored" | "queued" | "processing" | "ready" | "failed";
  createdAt: Date;
}

export interface CreateAttachmentRecord {
  id: string;
  reportId: string;
  kind: DailyReportAttachmentKind;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  durationSeconds: number | null;
}

export interface StudentStorageUsage {
  quotaBytes: number;
  usedBytes: number;
}

export interface ReportAttachmentCounts {
  image: number;
  audio: number;
}

const attachmentSelection = {
  id: dailyReportAttachments.id,
  reportId: dailyReportAttachments.reportId,
  kind: dailyReportAttachments.kind,
  storageKey: dailyReportAttachments.storageKey,
  originalName: dailyReportAttachments.originalName,
  mimeType: dailyReportAttachments.mimeType,
  sizeBytes: dailyReportAttachments.sizeBytes,
  checksumSha256: dailyReportAttachments.checksumSha256,
  durationSeconds: dailyReportAttachments.durationSeconds,
  processingStatus: dailyReportAttachments.processingStatus,
  createdAt: dailyReportAttachments.createdAt,
};

export interface DailyReportAttachmentRepository {
  reportBelongsToStudent(reportId: string, studentId: string): Promise<boolean>;
  findForStudent(
    reportId: string,
    attachmentId: string,
    studentId: string,
  ): Promise<AttachmentRecord | null>;
  listForStudent(reportId: string, studentId: string): Promise<AttachmentRecord[] | null>;
  countForReport(reportId: string): Promise<ReportAttachmentCounts>;
  storageUsage(studentId: string): Promise<StudentStorageUsage | null>;
  create(input: CreateAttachmentRecord): Promise<AttachmentRecord>;
}

export class DrizzleDailyReportAttachmentRepository implements DailyReportAttachmentRepository {
  constructor(private readonly database: AppDatabase) {}

  async reportBelongsToStudent(reportId: string, studentId: string): Promise<boolean> {
    const [report] = await this.database
      .select({ id: dailyReports.id })
      .from(dailyReports)
      .where(
        and(
          eq(dailyReports.id, reportId),
          eq(dailyReports.studentId, studentId),
          isNull(dailyReports.deletedAt),
        ),
      )
      .limit(1);
    return Boolean(report);
  }

  async findForStudent(
    reportId: string,
    attachmentId: string,
    studentId: string,
  ): Promise<AttachmentRecord | null> {
    const [attachment] = await this.database
      .select(attachmentSelection)
      .from(dailyReportAttachments)
      .innerJoin(dailyReports, eq(dailyReports.id, dailyReportAttachments.reportId))
      .where(
        and(
          eq(dailyReportAttachments.id, attachmentId),
          eq(dailyReportAttachments.reportId, reportId),
          eq(dailyReports.studentId, studentId),
          isNull(dailyReportAttachments.deletedAt),
          isNull(dailyReports.deletedAt),
        ),
      )
      .limit(1);
    return attachment ?? null;
  }

  async listForStudent(reportId: string, studentId: string): Promise<AttachmentRecord[] | null> {
    if (!(await this.reportBelongsToStudent(reportId, studentId))) return null;
    return this.database
      .select(attachmentSelection)
      .from(dailyReportAttachments)
      .where(
        and(
          eq(dailyReportAttachments.reportId, reportId),
          isNull(dailyReportAttachments.deletedAt),
        ),
      )
      .orderBy(asc(dailyReportAttachments.createdAt));
  }

  async countForReport(reportId: string): Promise<ReportAttachmentCounts> {
    const rows = await this.database
      .select({ kind: dailyReportAttachments.kind, count: sql<number>`count(*)`.mapWith(Number) })
      .from(dailyReportAttachments)
      .where(
        and(
          eq(dailyReportAttachments.reportId, reportId),
          isNull(dailyReportAttachments.deletedAt),
        ),
      )
      .groupBy(dailyReportAttachments.kind);
    return {
      image: rows.find((row) => row.kind === "image")?.count ?? 0,
      audio: rows.find((row) => row.kind === "audio")?.count ?? 0,
    };
  }

  async storageUsage(studentId: string): Promise<StudentStorageUsage | null> {
    const [user] = await this.database
      .select({ quotaBytes: users.storageQuotaBytes })
      .from(users)
      .where(eq(users.id, studentId))
      .limit(1);
    if (!user) return null;

    const [dailyUsage] = await this.database
      .select({
        bytes: sql<number>`coalesce(sum(${dailyReportAttachments.sizeBytes}), 0)`.mapWith(Number),
      })
      .from(dailyReportAttachments)
      .innerJoin(dailyReports, eq(dailyReports.id, dailyReportAttachments.reportId))
      .where(
        and(
          eq(dailyReports.studentId, studentId),
          isNull(dailyReportAttachments.deletedAt),
          isNull(dailyReports.deletedAt),
        ),
      );
    const [resourceUsage] = await this.database
      .select({ bytes: sql<number>`coalesce(sum(${resourceFiles.sizeBytes}), 0)`.mapWith(Number) })
      .from(resourceFiles)
      .innerJoin(resources, eq(resources.id, resourceFiles.resourceId))
      .where(
        and(
          eq(resources.ownerId, studentId),
          isNull(resourceFiles.deletedAt),
          isNull(resources.deletedAt),
        ),
      );
    return {
      quotaBytes: user.quotaBytes,
      usedBytes: (dailyUsage?.bytes ?? 0) + (resourceUsage?.bytes ?? 0),
    };
  }

  async create(input: CreateAttachmentRecord): Promise<AttachmentRecord> {
    const [created] = await this.database
      .insert(dailyReportAttachments)
      .values(input)
      .returning(attachmentSelection);
    if (!created) throw new Error("Unable to create daily-report attachment.");
    return created;
  }
}
