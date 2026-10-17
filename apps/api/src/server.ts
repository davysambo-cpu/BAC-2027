import { buildApp } from "./app";
import { environment } from "./config/env";
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
import { createMediaStorage } from "./modules/media/media.storage";

const connection = await createDatabaseConnection();
const authRepository = new DrizzleAuthRepository(connection.database);
const authService = new AuthService(authRepository, environment);
const catalogueRepository = new DrizzleCatalogueRepository(connection.database);
const catalogueService = new CatalogueService(catalogueRepository);
const dailyReportRepository = new DrizzleDailyReportRepository(connection.database);
const dailyReportService = new DailyReportService(dailyReportRepository);
const mediaStorage = createMediaStorage(environment);
const dailyReportAttachmentRepository = new DrizzleDailyReportAttachmentRepository(
  connection.database,
);
const dailyReportAttachmentService = new DailyReportAttachmentService(
  dailyReportAttachmentRepository,
  mediaStorage,
  environment,
);
const enrichmentRepository = new DrizzleEnrichmentRepository(connection.database);
const enrichmentService = new EnrichmentService(
  enrichmentRepository,
  new LocalOutlineEnrichmentProvider(),
);
const app = buildApp(
  {
    logger: {
      level: environment.LOG_LEVEL,
    },
  },
  {
    authService,
    catalogueService,
    dailyReportService,
    dailyReportAttachmentService,
    enrichmentService,
    environment,
  },
);

async function close(signal: NodeJS.Signals) {
  app.log.info({ signal }, "stopping API");
  await app.close();
  await connection.close();
  process.exit(0);
}

process.once("SIGINT", () => void close("SIGINT"));
process.once("SIGTERM", () => void close("SIGTERM"));

try {
  await app.listen({
    host: environment.HOST,
    port: environment.API_PORT,
  });
  app.log.info({ databaseDriver: connection.driver }, "database ready");
} catch (error) {
  app.log.fatal(error, "unable to start API");
  await connection.close();
  process.exit(1);
}
