import cookie from "@fastify/cookie";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

import { createTopicRevisionReviewRequestSchema, uuidSchema } from "@bac-2027/contracts";

import type { Environment } from "../../config/env";
import { ApplicationError } from "../../lib/errors";
import type { AuthService } from "../auth/auth.service";
import { sessionTokenFromRequest } from "../auth/auth.transport";
import type { RevisionService } from "./revision.service";

interface RevisionRoutesOptions {
  authService: AuthService;
  revisionService: RevisionService;
  environment: Environment;
}

function requireReviewIntent(request: FastifyRequest): void {
  if (request.headers["x-bac-revision"] !== "1") {
    throw new ApplicationError(
      "REVISION_WRITE_HEADER_REQUIRED",
      "L'en-tête de confirmation de la révision est requis.",
      400,
    );
  }
}

export const revisionRoutes: FastifyPluginAsync<RevisionRoutesOptions> = async (
  app,
  { authService, revisionService, environment },
) => {
  await app.register(cookie);

  async function currentUser(request: Parameters<typeof sessionTokenFromRequest>[0]) {
    const session = await authService.authenticate(sessionTokenFromRequest(request, environment));
    return session.user;
  }

  app.get("/api/v1/revision/topics", async (request, reply) => {
    const overview = await revisionService.overview(await currentUser(request));
    reply.header("Cache-Control", "private, no-store");
    return overview;
  });

  app.post(
    "/api/v1/revision/topics/:catalogueItemId/reviews",
    { config: { rateLimit: { max: 120, timeWindow: "1 hour" } } },
    async (request, reply) => {
      requireReviewIntent(request);
      const catalogueItemId = uuidSchema.parse(
        (request.params as { catalogueItemId?: unknown }).catalogueItemId,
      );
      const review = await revisionService.recordReview(
        await currentUser(request),
        catalogueItemId,
        createTopicRevisionReviewRequestSchema.parse(request.body),
      );
      reply.header("Cache-Control", "private, no-store");
      return reply.status(201).send(review);
    },
  );
};
