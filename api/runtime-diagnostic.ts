import type { IncomingMessage, ServerResponse } from "node:http";

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown serverless diagnostic error.";
}

export default async function handler(_request: IncomingMessage, response: ServerResponse) {
  let stage = "handler";

  try {
    stage = "bundle-import";
    const serverlessBundle = await import("../apps/api/vercel/handler.mjs");

    if (typeof serverlessBundle.default !== "function") {
      throw new Error("The serverless bundle does not export a default handler.");
    }

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
