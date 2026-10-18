import cookie from "@fastify/cookie";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

import {
  createRevisionSessionRequestSchema,
  deleteRevisionSessionRequestSchema,
  updateRevisionSessionRequestSchema,
  uuidSchema,
} from "@bac-2027/contracts";

import type { Environment } from "../../config/env";
import { ApplicationError } from "../../lib/errors";
import type { AuthService } from "../auth/auth.service";
import { sessionTokenFromRequest } from "../auth/auth.transport";
import type { PlanningService } from "./planning.service";

interface PlanningRoutesOptions {
  authService: AuthService;
  planningService: PlanningService;
  environment: Environment;
}

function requirePlanningIntent(request: FastifyRequest): void {
  if (request.headers["x-bac-planning"] !== "1") {
    throw new ApplicationError(
      "PLANNING_WRITE_HEADER_REQUIRED",
      "L'en-tête de confirmation du planning est requis.",
      400,
    );
  }
}

export const planningRoutes: FastifyPluginAsync<PlanningRoutesOptions> = async (
  app,
  { authService, planningService, environment },
) => {
  await app.register(cookie);

  async function currentUser(request: Parameters<typeof sessionTokenFromRequest>[0]) {
    const session = await authService.authenticate(sessionTokenFromRequest(request, environment));
    return session.user;
  }

  app.get("/api/v1/planning/sessions", async (request, reply) => {
    const sessions = await planningService.list(await currentUser(request));
    reply.header("Cache-Control", "private, no-store");
    return sessions;
  });

  app.post(
    "/api/v1/planning/sessions",
    { config: { rateLimit: { max: 240, timeWindow: "1 hour" } } },
    async (request, reply) => {
      requirePlanningIntent(request);
      const session = await planningService.create(
        await currentUser(request),
        createRevisionSessionRequestSchema.parse(request.body),
      );
      reply.header("Cache-Control", "private, no-store");
      return reply.status(201).send(session);
    },
  );

  app.patch(
    "/api/v1/planning/sessions/:sessionId",
    { config: { rateLimit: { max: 240, timeWindow: "1 hour" } } },
    async (request, reply) => {
      requirePlanningIntent(request);
      const sessionId = uuidSchema.parse((request.params as { sessionId?: unknown }).sessionId);
      const session = await planningService.update(
        await currentUser(request),
        sessionId,
        updateRevisionSessionRequestSchema.parse(request.body),
      );
      reply.header("Cache-Control", "private, no-store");
      return session;
    },
  );

  app.delete(
    "/api/v1/planning/sessions/:sessionId",
    { config: { rateLimit: { max: 240, timeWindow: "1 hour" } } },
    async (request, reply) => {
      requirePlanningIntent(request);
      const sessionId = uuidSchema.parse((request.params as { sessionId?: unknown }).sessionId);
      await planningService.delete(
        await currentUser(request),
        sessionId,
        deleteRevisionSessionRequestSchema.parse(request.body),
      );
      reply.header("Cache-Control", "private, no-store");
      return reply.status(204).send();
    },
  );
};
