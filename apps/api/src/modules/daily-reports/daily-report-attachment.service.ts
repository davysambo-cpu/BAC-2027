import { createHash } from "node:crypto";

import type {
  CurrentUser,
  DailyReportAttachment,
  DailyReportAttachmentKind,
  DailyReportAttachmentListResponse,
} from "@bac-2027/contracts";

import type { Environment } from "../../config/env";
import { ApplicationError } from "../../lib/errors";
import type { MediaStorage, StoredMediaObject } from "../media/media.storage";
import { safeOriginalName, validateMedia } from "../media/media.validation";
import type {
  AttachmentRecord,
  DailyReportAttachmentRepository,
} from "./daily-report-attachment.repository";

export interface UploadDailyReportAttachment {
  id: string;
  reportId: string;
  kind: DailyReportAttachmentKind;
  originalName: string;
  content: Buffer;
  durationSeconds: number | null;
}

export interface DownloadableDailyReportAttachment {
  metadata: DailyReportAttachment;
  object: StoredMediaObject;
}

type AttachmentConfiguration = Pick<
  Environment,
  "MAX_IMAGE_SIZE_MB" | "MAX_AUDIO_SIZE_MB" | "MAX_DAILY_REPORT_IMAGES" | "MAX_DAILY_REPORT_AUDIO"
>;

export class DailyReportAttachmentService {
  constructor(
    private readonly repository: DailyReportAttachmentRepository,
    private readonly storage: MediaStorage,
    private readonly configuration: AttachmentConfiguration,
  ) {}

  async upload(
    user: CurrentUser,
    input: UploadDailyReportAttachment,
  ): Promise<DailyReportAttachment> {
    this.requireStudent(user);
    if (!(await this.repository.reportBelongsToStudent(input.reportId, user.id))) {
      throw new ApplicationError("NOT_FOUND", "Bilan quotidien introuvable.", 404);
    }

    const maximumBytes =
      (input.kind === "image"
        ? this.configuration.MAX_IMAGE_SIZE_MB
        : this.configuration.MAX_AUDIO_SIZE_MB) *
      1024 *
      1024;
    const detected = validateMedia(input.content, input.kind, maximumBytes);
    const checksumSha256 = createHash("sha256").update(input.content).digest("hex");

    const existing = await this.repository.findForStudent(input.reportId, input.id, user.id);
    if (existing) {
      if (existing.checksumSha256 !== checksumSha256 || existing.kind !== input.kind) {
        throw new ApplicationError(
          "RESOURCE_VERSION_CONFLICT",
          "Cet identifiant de pièce jointe est déjà utilisé pour un autre fichier.",
          409,
        );
      }
      return this.toPublicAttachment(existing);
    }

    const counts = await this.repository.countForReport(input.reportId);
    const maximumCount =
      input.kind === "image"
        ? this.configuration.MAX_DAILY_REPORT_IMAGES
        : this.configuration.MAX_DAILY_REPORT_AUDIO;
    if (counts[input.kind] >= maximumCount) {
      throw new ApplicationError(
        "STORAGE_QUOTA_EXCEEDED",
        input.kind === "image"
          ? `Ce bilan accepte au maximum ${maximumCount} photos.`
          : `Ce bilan accepte au maximum ${maximumCount} audio.`,
        413,
      );
    }

    const usage = await this.repository.storageUsage(user.id);
    if (!usage || usage.usedBytes + input.content.length > usage.quotaBytes) {
      throw new ApplicationError(
        "STORAGE_QUOTA_EXCEEDED",
        "Votre espace de stockage est insuffisant pour ce fichier.",
        413,
      );
    }

    const storageKey = [
      "users",
      user.id,
      "daily-reports",
      input.reportId,
      `${input.id}.${detected.extension}`,
    ].join("/");
    await this.storage.put(storageKey, input.content, detected.mimeType);
    try {
      const created = await this.repository.create({
        id: input.id,
        reportId: input.reportId,
        kind: input.kind,
        storageKey,
        originalName: safeOriginalName(input.originalName),
        mimeType: detected.mimeType,
        sizeBytes: input.content.length,
        checksumSha256,
        durationSeconds: input.durationSeconds,
      });
      return this.toPublicAttachment(created);
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async list(user: CurrentUser, reportId: string): Promise<DailyReportAttachmentListResponse> {
    this.requireStudent(user);
    const records = await this.repository.listForStudent(reportId, user.id);
    if (!records) throw new ApplicationError("NOT_FOUND", "Bilan quotidien introuvable.", 404);
    return { attachments: records.map((record) => this.toPublicAttachment(record)) };
  }

  async download(
    user: CurrentUser,
    reportId: string,
    attachmentId: string,
  ): Promise<DownloadableDailyReportAttachment> {
    this.requireStudent(user);
    const record = await this.repository.findForStudent(reportId, attachmentId, user.id);
    if (!record) throw new ApplicationError("NOT_FOUND", "Pièce jointe introuvable.", 404);
    const object = await this.storage.get(record.storageKey);
    if (!object) throw new ApplicationError("NOT_FOUND", "Fichier média introuvable.", 404);
    return { metadata: this.toPublicAttachment(record), object };
  }

  private toPublicAttachment(record: AttachmentRecord): DailyReportAttachment {
    return {
      id: record.id,
      reportId: record.reportId,
      kind: record.kind,
      originalName: record.originalName,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      checksumSha256: record.checksumSha256,
      durationSeconds: record.durationSeconds,
      processingStatus: record.processingStatus,
      contentPath: `/api/v1/daily-reports/${encodeURIComponent(record.reportId)}/attachments/${encodeURIComponent(record.id)}/content`,
      createdAt: record.createdAt.toISOString(),
    };
  }

  private requireStudent(user: CurrentUser): void {
    if (user.role !== "student") {
      throw new ApplicationError(
        "FORBIDDEN",
        "Les médias de bilan sont réservés aux espaces élèves.",
        403,
      );
    }
  }
}
