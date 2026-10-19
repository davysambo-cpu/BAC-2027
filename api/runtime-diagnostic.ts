import type { IncomingMessage, ServerResponse } from "node:http";

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown serverless diagnostic error.";
}

export default async function handler(_request: IncomingMessage, response: ServerResponse) {
  let stage = "handler";

  try {
    stage = "environment-import";
    const { environment } = await import("../apps/api/src/config/env");

    stage = "runtime-import";
    const { createApiRuntime } = await import("../apps/api/src/runtime");

    stage = "runtime-create";
    const { app, connection } = await createApiRuntime(environment, { logger: false });

    stage = "fastify-ready";
    await app.ready();

    stage = "cleanup";
    await app.close();
    await connection.close();

    response.statusCode = 200;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ status: "ok", stage: "complete" }));
  } catch (error) {
    console.error(`BAC-2027 serverless diagnostic failed at ${stage}.`, error);
    response.statusCode = 503;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(
      JSON.stringify({
        status: "error",
        stage,
        detail: errorMessage(error),
      }),
    );
  }
}
