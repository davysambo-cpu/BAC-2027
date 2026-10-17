import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import Fastify, { type FastifyError, type FastifyServerOptions } from "fastify";
import { ZodError } from "zod";

import { environment as defaultEnvironment, type Environment } from "./config/env";
import { ApplicationError } from "./lib/errors";
import { authRoutes } from "./modules/auth/auth.routes";
import type { AuthService } from "./modules/auth/auth.service";
import { catalogueRoutes } from "./modules/catalogue/catalogue.routes";
import type { CatalogueService } from "./modules/catalogue/catalogue.service";
import { dailyReportAttachmentRoutes } from "./modules/daily-reports/daily-report-attachment.routes";
import type { DailyReportAttachmentService } from "./modules/daily-reports/daily-report-attachment.service";
import { dailyReportRoutes } from "./modules/daily-reports/daily-report.routes";
import type { DailyReportService } from "./modules/daily-reports/daily-report.service";
import { enrichmentRoutes } from "./modules/daily-reports/enrichment.routes";
import type { EnrichmentService } from "./modules/daily-reports/enrichment.service";
import { knowledgeRoutes } from "./modules/knowledge/knowledge.routes";
import type { KnowledgeService } from "./modules/knowledge/knowledge.service";
import { revisionRoutes } from "./modules/revision/revision.routes";
import type { RevisionService } from "./modules/revision/revision.service";
import { healthRoutes } from "./routes/health";

interface AppDependencies {
  authService?: AuthService;
  catalogueService?: CatalogueService;
  dailyReportService?: DailyReportService;
  dailyReportAttachmentService?: DailyReportAttachmentService;
  enrichmentService?: EnrichmentService;
  knowledgeService?: KnowledgeService;
  revisionService?: RevisionService;
  environment?: Environment;
}

export function buildApp(options: FastifyServerOptions = {}, dependencies: AppDependencies = {}) {
  const app = Fastify(options);
  const environment = dependencies.environment ?? defaultEnvironment;

  void app.register(sensible);
  void app.register(helmet, {
    contentSecurityPolicy: false,
  });
  void app.register(rateLimit, {
    global: false,
  });
  void app.register(healthRoutes);
  if (dependencies.authService) {
    void app.register(authRoutes, {
      authService: dependencies.authService,
      environment,
    });
  }
  if (dependencies.authService && dependencies.catalogueService) {
    void app.register(catalogueRoutes, {
      authService: dependencies.authService,
      catalogueService: dependencies.catalogueService,
      environment,
    });
  }
  if (dependencies.authService && dependencies.dailyReportService) {
    void app.register(dailyReportRoutes, {
      authService: dependencies.authService,
      dailyReportService: dependencies.dailyReportService,
      environment,
    });
  }
  if (dependencies.authService && dependencies.dailyReportAttachmentService) {
    void app.register(dailyReportAttachmentRoutes, {
      authService: dependencies.authService,
      attachmentService: dependencies.dailyReportAttachmentService,
      environment,
    });
  }
  if (dependencies.authService && dependencies.enrichmentService) {
    void app.register(enrichmentRoutes, {
      authService: dependencies.authService,
      enrichmentService: dependencies.enrichmentService,
      environment,
    });
  }
  if (dependencies.authService && dependencies.knowledgeService) {
    void app.register(knowledgeRoutes, {
      authService: dependencies.authService,
      knowledgeService: dependencies.knowledgeService,
      environment,
    });
  }
  if (dependencies.authService && dependencies.revisionService) {
    void app.register(revisionRoutes, {
      authService: dependencies.authService,
      revisionService: dependencies.revisionService,
      environment,
    });
  }

  app.setNotFoundHandler((request, reply) => {
    void reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: "La ressource demandée est introuvable.",
        requestId: request.id,
      },
    });
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof ZodError) {
      void reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Certaines informations sont invalides.",
          requestId: request.id,
          details: { issues: error.issues },
        },
      });
      return;
    }

    if (error instanceof ApplicationError) {
      void reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          requestId: request.id,
          ...(error.details ? { details: error.details } : {}),
        },
      });
      return;
    }

    request.log.error({ error }, "request failed");
    const statusCode = error.statusCode ?? 500;
    const rateLimited = statusCode === 429;
    const clientError = statusCode < 500;
    void reply.status(statusCode).send({
      error: {
        code: rateLimited ? "RATE_LIMITED" : clientError ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message: rateLimited
          ? "Trop de tentatives. Patientez avant de réessayer."
          : clientError
            ? "La requête envoyée est invalide."
            : "Le service rencontre un problème temporaire.",
        requestId: request.id,
      },
    });
  });

  return app;
}
