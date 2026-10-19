import type { IncomingMessage, ServerResponse } from "node:http";

import { createApiRuntime } from "./runtime";

let runtime: ReturnType<typeof createApiRuntime> | undefined;

function runtimeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown runtime initialization error.";
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    runtime ??= createApiRuntime();
    const { app } = await runtime;
    await app.ready();
    app.server.emit("request", request, response);
  } catch (error) {
    runtime = undefined;
    console.error("Unable to initialize the BAC-2027 API runtime.", error);
    if (response.headersSent) {
      response.destroy(error instanceof Error ? error : undefined);
      return;
    }
    response.statusCode = 503;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(
      JSON.stringify({
        error: "api_runtime_unavailable",
        ...(process.env.PILOT_MODE === "true" ? { detail: runtimeErrorMessage(error) } : {}),
      }),
    );
  }
}
