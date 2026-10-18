import { environment } from "./config/env";
import { createApiRuntime } from "./runtime";

const { app, connection } = await createApiRuntime();

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
