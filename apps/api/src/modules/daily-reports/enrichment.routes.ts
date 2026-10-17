import cookie from "@fastify/cookie";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

import {
  generateCourseDraftRequestSchema,
  reviewDraftCorrectionRequestSchema,
  uuidSchema,
} from "@bac-2027/contracts";

import type { Environment } from "../../config/env";
import { ApplicationError } from "../../lib/errors";
import type { AuthService } from "../auth/auth.service";
import { sessionTokenFromRequest } from "../auth/auth.transport";
import type { EnrichmentService } from "./enrichment.service";

interface EnrichmentRoutesOptions {
  authService: AuthService;
  enrichmentService: EnrichmentService;
  environment: Environment;
}

function requireMutationIntent(request: FastifyRequest): void {
  if (request.headers["x-bac-enrichment"] !== "1") {
    throw new ApplicationError(
      "ENRICHMENT_HEADER_REQUIRED",
      "L'en-tête de confirmation de l'enrichissement est requis.",
      400,
    );
  }
}

export const enrichmentRoutes: FastifyPluginAsync<EnrichmentRoutesOptions> = async (
  app,
  { authService, enrichmentService, environment },
) => {
  await app.register(cookie);

  async function currentUser(request: Parameters<typeof sessionTokenFromRequest>[0]) {
    const session = await authService.authenticate(sessionTokenFromRequest(request, environment));
    return session.user;
  }

  app.get("/api/v1/daily-reports/:reportId/draft", async (request, reply) => {
    const { reportId } = request.params as { reportId: string };
    const draft = await enrichmentService.latest(
      await currentUser(request),
      uuidSchema.parse(reportId),
    );
    reply.header("Cache-Control", "private, no-store");
    return draft;
  });

  app.post(
    "/api/v1/daily-reports/:reportId/enrichment",
    { config: { rateLimit: { max: 12, timeWindow: "1 hour" } } },
    async (request, reply) => {
      requireMutationIntent(request);
      const { reportId } = request.params as { reportId: string };
      const { force } = generateCourseDraftRequestSchema.parse(request.body);
      const draft = await enrichmentService.generate(
        await currentUser(request),
        uuidSchema.parse(reportId),
        force,
      );
      reply.header("Cache-Control", "private, no-store");
      return reply.status(201).send(draft);
    },
  );

  app.patch(
    "/api/v1/daily-reports/:reportId/draft/corrections/:correctionId",
    { config: { rateLimit: { max: 60, timeWindow: "1 hour" } } },
    async (request, reply) => {
      requireMutationIntent(request);
      const { reportId, correctionId } = request.params as {
        reportId: string;
        correctionId: string;
      };
      const draft = await enrichmentService.reviewCorrection(
        await currentUser(request),
        uuidSchema.parse(reportId),
        uuidSchema.parse(correctionId),
        reviewDraftCorrectionRequestSchema.parse(request.body),
      );
      reply.header("Cache-Control", "private, no-store");
      return draft;
    },
  );

  app.post(
    "/api/v1/daily-reports/:reportId/draft/accept",
    { config: { rateLimit: { max: 20, timeWindow: "1 hour" } } },
    async (request, reply) => {
      requireMutationIntent(request);
      const { reportId } = request.params as { reportId: string };
      const draft = await enrichmentService.accept(
        await currentUser(request),
        uuidSchema.parse(reportId),
      );
      reply.header("Cache-Control", "private, no-store");
      return draft;
    },
  );
};
