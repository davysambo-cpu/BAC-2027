import cookie from "@fastify/cookie";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

import {
  confirmCatalogueItemsRequestSchema,
  updateCatalogueItemValidationRequestSchema,
  uuidSchema,
} from "@bac-2027/contracts";

import type { Environment } from "../../config/env";
import { ApplicationError } from "../../lib/errors";
import type { AuthService } from "../auth/auth.service";
import { sessionTokenFromRequest } from "../auth/auth.transport";
import type { CatalogueService } from "./catalogue.service";

interface CatalogueRoutesOptions {
  authService: AuthService;
  catalogueService: CatalogueService;
  environment: Environment;
}

function requireValidationIntent(request: FastifyRequest): void {
  if (request.headers["x-bac-catalogue-validation"] !== "1") {
    throw new ApplicationError(
      "CATALOGUE_VALIDATION_HEADER_REQUIRED",
      "L'en-tête de confirmation de validation du catalogue est requis.",
      400,
    );
  }
}

export const catalogueRoutes: FastifyPluginAsync<CatalogueRoutesOptions> = async (
  app,
  { authService, catalogueService, environment },
) => {
  await app.register(cookie);

  async function currentUser(request: Parameters<typeof sessionTokenFromRequest>[0]) {
    const session = await authService.authenticate(sessionTokenFromRequest(request, environment));
    return session.user;
  }

  app.get(
    "/api/v1/catalogue",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const user = await currentUser(request);
      const catalogue = await catalogueService.getStudentCatalogue(user.seriesCode ?? "D");
      reply.header("Cache-Control", "private, max-age=300");
      return catalogue;
    },
  );

  app.get("/api/v1/admin/catalogue", async (request, reply) => {
    const catalogue = await catalogueService.getAdminCatalogue(await currentUser(request), "D");
    reply.header("Cache-Control", "private, no-store");
    return catalogue;
  });

  app.patch(
    "/api/v1/admin/catalogue/items/:itemId/validation",
    { config: { rateLimit: { max: 120, timeWindow: "1 hour" } } },
    async (request, reply) => {
      requireValidationIntent(request);
      const itemId = uuidSchema.parse((request.params as { itemId?: unknown }).itemId);
      const result = await catalogueService.updateItemValidation(
        await currentUser(request),
        itemId,
        updateCatalogueItemValidationRequestSchema.parse(request.body),
        request.id,
      );
      reply.header("Cache-Control", "private, no-store");
      return result;
    },
  );

  app.post(
    "/api/v1/admin/catalogue/confirmations",
    { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } },
    async (request, reply) => {
      requireValidationIntent(request);
      const result = await catalogueService.confirmVisibleItems(
        await currentUser(request),
        confirmCatalogueItemsRequestSchema.parse(request.body),
        request.id,
      );
      reply.header("Cache-Control", "private, no-store");
      return result;
    },
  );
};
