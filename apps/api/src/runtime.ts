import type { FastifyServerOptions } from "fastify";

import { buildApp } from "./app";
import { environment, type Environment } from "./config/env";
import { createDatabaseConnection } from "./db/client";
import { DrizzleAuthRepository } from "./modules/auth/auth.repository";
import { AuthService } from "./modules/auth/auth.service";
import { DrizzleCatalogueRepository } from "./modules/catalogue/catalogue.repository";
import { CatalogueService } from "./modules/catalogue/catalogue.service";
import { DrizzleDailyReportAttachmentRepository } from "./modules/daily-reports/daily-report-attachment.repository";
import { DailyReportAttachmentService } from "./modules/daily-reports/daily-report-attachment.service";
import { DrizzleDailyReportRepository } from "./modules/daily-reports/daily-report.repository";
import { DailyReportService } from "./modules/daily-reports/daily-report.service";
import { LocalOutlineEnrichmentProvider } from "./modules/daily-reports/enrichment.provider";
import { DrizzleEnrichmentRepository } from "./modules/daily-reports/enrichment.repository";
import { EnrichmentService } from "./modules/daily-reports/enrichment.service";
import { CuratedCorpusEnrichmentProvider } from "./modules/knowledge/curated-enrichment.provider";
import { DrizzleKnowledgeRepository } from "./modules/knowledge/knowledge.repository";
import { KnowledgeService } from "./modules/knowledge/knowledge.service";
import { createMediaStorage } from "./modules/media/media.storage";
import { DrizzlePlanningRepository } from "./modules/planning/planning.repository";
import { PlanningService } from "./modules/planning/planning.service";
import { DrizzleRevisionRepository } from "./modules/revision/revision.repository";
import { RevisionService } from "./modules/revision/revision.service";

export async function createApiRuntime(
  configuration: Environment = environment,
  options: FastifyServerOptions = {},
) {
  const connection = await createDatabaseConnection(configuration);
  const authRepository = new DrizzleAuthRepository(connection.database);
  const authService = new AuthService(authRepository, configuration);
  const catalogueRepository = new DrizzleCatalogueRepository(connection.database);
  const catalogueService = new CatalogueService(catalogueRepository);
  const dailyReportRepository = new DrizzleDailyReportRepository(connection.database);
  const dailyReportService = new DailyReportService(dailyReportRepository);
  const mediaStorage = createMediaStorage(configuration);
  const dailyReportAttachmentRepository = new DrizzleDailyReportAttachmentRepository(
    connection.database,
  );
  const dailyReportAttachmentService = new DailyReportAttachmentService(
    dailyReportAttachmentRepository,
    mediaStorage,
    configuration,
  );
  const knowledgeRepository = new DrizzleKnowledgeRepository(connection.database);
  const knowledgeService = new KnowledgeService(knowledgeRepository);
  const planningService = new PlanningService(new DrizzlePlanningRepository(connection.database));
  const revisionService = new RevisionService(
    new DrizzleRevisionRepository(connection.database),
    configuration.REVISION_TARGET_MONTH,
  );
  const enrichmentRepository = new DrizzleEnrichmentRepository(connection.database);
  const enrichmentService = new EnrichmentService(
    enrichmentRepository,
    new CuratedCorpusEnrichmentProvider(knowledgeRepository, new LocalOutlineEnrichmentProvider()),
  );
  const app = buildApp(
    {
      logger: { level: configuration.LOG_LEVEL },
      ...options,
    },
    {
      authService,
      catalogueService,
      dailyReportService,
      dailyReportAttachmentService,
      enrichmentService,
      knowledgeService,
      planningService,
      revisionService,
      environment: configuration,
    },
  );

  return {
    app,
    connection,
    services: {
      authService,
      catalogueService,
      dailyReportService,
      dailyReportAttachmentService,
      enrichmentService,
      knowledgeService,
      planningService,
      revisionService,
    },
  };
}
