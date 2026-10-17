import cookie from "@fastify/cookie";
import type { FastifyPluginAsync } from "fastify";

import type { Environment } from "../../config/env";
import type { AuthService } from "../auth/auth.service";
import { sessionTokenFromRequest } from "../auth/auth.transport";
import type { CatalogueService } from "./catalogue.service";

interface CatalogueRoutesOptions {
  authService: AuthService;
  catalogueService: CatalogueService;
  environment: Environment;
}

export const catalogueRoutes: FastifyPluginAsync<CatalogueRoutesOptions> = async (
  app,
  { authService, catalogueService, environment },
) => {
  await app.register(cookie);

  app.get(
    "/api/v1/catalogue",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const session = await authService.authenticate(sessionTokenFromRequest(request, environment));
      const catalogue = await catalogueService.getStudentCatalogue(session.user.seriesCode ?? "D");
      reply.header("Cache-Control", "private, max-age=300");
      return catalogue;
    },
  );
};
