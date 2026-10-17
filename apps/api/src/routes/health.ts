import type { HealthResponse } from "@bac-2027/contracts";
import type { FastifyPluginAsync } from "fastify";

import { environment } from "../config/env";

const API_VERSION = "0.1.0";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/health", async (): Promise<HealthResponse> => ({
    service: "bac-2027-api",
    status: "ok",
    version: API_VERSION,
    timestamp: new Date().toISOString(),
    environment: environment.NODE_ENV,
  }));
};
