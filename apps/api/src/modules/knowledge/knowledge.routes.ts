import cookie from "@fastify/cookie";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

import {
  createKnowledgeCardRequestSchema,
  updateKnowledgeCardRequestSchema,
  uuidSchema,
} from "@bac-2027/contracts";

import type { Environment } from "../../config/env";
import { ApplicationError } from "../../lib/errors";
import type { AuthService } from "../auth/auth.service";
import { sessionTokenFromRequest } from "../auth/auth.transport";
import type { KnowledgeService } from "./knowledge.service";

interface KnowledgeRoutesOptions {
  authService: AuthService;
  knowledgeService: KnowledgeService;
  environment: Environment;
}

function requireWriteIntent(request: FastifyRequest): void {
  if (request.headers["x-bac-knowledge-write"] !== "1") {
    throw new ApplicationError(
      "KNOWLEDGE_WRITE_HEADER_REQUIRED",
      "L'en-tête de confirmation de publication est requis.",
      400,
    );
  }
}

export const knowledgeRoutes: FastifyPluginAsync<KnowledgeRoutesOptions> = async (
  app,
  { authService, knowledgeService, environment },
) => {
  await app.register(cookie);

  async function currentUser(request: Parameters<typeof sessionTokenFromRequest>[0]) {
    const session = await authService.authenticate(sessionTokenFromRequest(request, environment));
    return session.user;
  }

  app.get("/api/v1/admin/knowledge-cards", async (request, reply) => {
    const cards = await knowledgeService.list(await currentUser(request));
    reply.header("Cache-Control", "private, no-store");
    return cards;
  });

  app.post(
    "/api/v1/admin/knowledge-cards",
    { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } },
    async (request, reply) => {
      requireWriteIntent(request);
      const card = await knowledgeService.create(
        await currentUser(request),
        createKnowledgeCardRequestSchema.parse(request.body),
      );
      reply.header("Cache-Control", "private, no-store");
      return reply.status(201).send(card);
    },
  );

  app.put(
    "/api/v1/admin/knowledge-cards/:cardId",
    { config: { rateLimit: { max: 60, timeWindow: "1 hour" } } },
    async (request, reply) => {
      requireWriteIntent(request);
      const cardId = uuidSchema.parse((request.params as { cardId?: unknown }).cardId);
      const card = await knowledgeService.update(
        await currentUser(request),
        cardId,
        updateKnowledgeCardRequestSchema.parse(request.body),
      );
      reply.header("Cache-Control", "private, no-store");
      return card;
    },
  );
};
