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
};
