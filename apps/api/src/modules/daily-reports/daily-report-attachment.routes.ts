import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

import { dailyReportAttachmentKindSchema, uuidSchema } from "@bac-2027/contracts";

import type { Environment } from "../../config/env";
import { ApplicationError } from "../../lib/errors";
import type { AuthService } from "../auth/auth.service";
import { sessionTokenFromRequest } from "../auth/auth.transport";
import type { DailyReportAttachmentService } from "./daily-report-attachment.service";

const reportParametersSchema = z.object({ reportId: uuidSchema });
const attachmentParametersSchema = z.object({
  reportId: uuidSchema,
  attachmentId: uuidSchema,
});
const uploadFieldsSchema = z.object({
  id: uuidSchema,
  kind: dailyReportAttachmentKindSchema,
  durationSeconds: z.coerce.number().int().nonnegative().max(3_600).nullable().default(null),
});

interface DailyReportAttachmentRoutesOptions {
  authService: AuthService;
  attachmentService: DailyReportAttachmentService;
  environment: Environment;
}

export const dailyReportAttachmentRoutes: FastifyPluginAsync<
  DailyReportAttachmentRoutesOptions
> = async (app, { authService, attachmentService, environment }) => {
  await app.register(cookie);
  const maximumFileBytes =
    Math.max(environment.MAX_IMAGE_SIZE_MB, environment.MAX_AUDIO_SIZE_MB) * 1024 * 1024;
  await app.register(multipart, {
    limits: {
      fieldNameSize: 80,
      fieldSize: 2_000,
      fields: 4,
      fileSize: maximumFileBytes,
      files: 1,
      parts: 5,
    },
  });

  async function currentUser(request: FastifyRequest) {
    const session = await authService.authenticate(sessionTokenFromRequest(request, environment));
    return session.user;
  }

  app.get("/api/v1/daily-reports/:reportId/attachments", async (request, reply) => {
    const { reportId } = reportParametersSchema.parse(request.params);
    const result = await attachmentService.list(await currentUser(request), reportId);
    reply.header("Cache-Control", "private, no-store");
    return result;
  });

  app.post(
    "/api/v1/daily-reports/:reportId/attachments",
    {
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      if (request.headers["x-bac-media-upload"] !== "1") {
        throw new ApplicationError(
          "FORBIDDEN",
          "L'envoi de média doit provenir de l'application BAC-2027.",
          403,
        );
      }
      const { reportId } = reportParametersSchema.parse(request.params);
      const fields: Record<string, unknown> = {};
      let file: { content: Buffer; filename: string } | null = null;
      try {
        for await (const part of request.parts()) {
          if (part.type === "file") {
            if (file) {
              part.file.resume();
              throw new ApplicationError(
                "VALIDATION_ERROR",
                "Envoyez une seule pièce jointe à la fois.",
                400,
              );
            }
            file = {
              content: await part.toBuffer(),
              filename: part.filename || "media",
            };
          } else {
            fields[part.fieldname] = part.value;
          }
        }
      } catch (error) {
        if (error instanceof app.multipartErrors.RequestFileTooLargeError) {
          throw new ApplicationError(
            "STORAGE_QUOTA_EXCEEDED",
            `Le fichier dépasse la limite de ${Math.floor(maximumFileBytes / 1024 / 1024)} Mo.`,
            413,
          );
        }
        throw error;
      }
      if (!file) {
        throw new ApplicationError("VALIDATION_ERROR", "Aucun fichier média n'a été reçu.", 400);
      }
      const parsedFields = uploadFieldsSchema.parse({
        ...fields,
        durationSeconds:
          fields.durationSeconds === undefined || fields.durationSeconds === ""
            ? null
            : fields.durationSeconds,
      });
      const attachment = await attachmentService.upload(await currentUser(request), {
        ...parsedFields,
        reportId,
        originalName: file.filename,
        content: file.content,
      });
      reply.header("Cache-Control", "private, no-store");
      return reply.status(201).send(attachment);
    },
  );

  app.get(
    "/api/v1/daily-reports/:reportId/attachments/:attachmentId/content",
    async (request, reply) => {
      const { reportId, attachmentId } = attachmentParametersSchema.parse(request.params);
      const downloadable = await attachmentService.download(
        await currentUser(request),
        reportId,
        attachmentId,
      );
      reply
        .header("Cache-Control", "private, no-store")
        .header("Content-Type", downloadable.metadata.mimeType)
        .header("Content-Length", downloadable.object.sizeBytes ?? downloadable.metadata.sizeBytes)
        .header(
          "Content-Disposition",
          `inline; filename*=UTF-8''${encodeURIComponent(downloadable.metadata.originalName)}`,
        )
        .header("X-Content-Type-Options", "nosniff")
        .header("Cross-Origin-Resource-Policy", "same-origin");
      return reply.send(downloadable.object.body);
    },
  );
};
