import type { IncomingMessage, ServerResponse } from "node:http";

let serverlessHandler: Promise<
  (request: IncomingMessage, response: ServerResponse) => Promise<void>
> | null = null;

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown serverless bundle loading error.";
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    serverlessHandler ??= import("../apps/api/vercel/handler.mjs").then((bundle) => bundle.default);
    const bundledHandler = await serverlessHandler;
    await bundledHandler(request, response);
  } catch (error) {
    serverlessHandler = null;
    console.error("Unable to load the BAC-2027 serverless bundle.", error);
    if (response.headersSent) {
      response.destroy(error instanceof Error ? error : undefined);
      return;
    }
    response.statusCode = 503;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(
      JSON.stringify({
        error: "api_bundle_unavailable",
        ...(process.env.PILOT_MODE === "true" ? { detail: errorMessage(error) } : {}),
      }),
    );
  }
}
