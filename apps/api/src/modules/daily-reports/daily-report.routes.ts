import cookie from "@fastify/cookie";
import type { FastifyPluginAsync } from "fastify";

import { createDailyReportRequestSchema } from "@bac-2027/contracts";

import type { Environment } from "../../config/env";
import type { AuthService } from "../auth/auth.service";
import { sessionTokenFromRequest } from "../auth/auth.transport";
import type { DailyReportService } from "./daily-report.service";

interface DailyReportRoutesOptions {
  authService: AuthService;
  dailyReportService: DailyReportService;
  environment: Environment;
}

export const dailyReportRoutes: FastifyPluginAsync<DailyReportRoutesOptions> = async (
  app,
  { authService, dailyReportService, environment },
) => {
  await app.register(cookie);

  async function currentUser(request: Parameters<typeof sessionTokenFromRequest>[0]) {
    const session = await authService.authenticate(sessionTokenFromRequest(request, environment));
    return session.user;
  }

  app.get("/api/v1/daily-reports", async (request, reply) => {
    const response = await dailyReportService.list(await currentUser(request));
    reply.header("Cache-Control", "private, no-store");
    return response;
  });

  app.post(
    "/api/v1/daily-reports",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const input = createDailyReportRequestSchema.parse(request.body);
      const report = await dailyReportService.create(await currentUser(request), input);
      reply.header("Cache-Control", "private, no-store");
      return reply.status(201).send(report);
    },
  );
};
