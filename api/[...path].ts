import type { IncomingMessage, ServerResponse } from "node:http";

import { createApiRuntime } from "../apps/api/src/runtime";

const runtime = createApiRuntime();

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  const { app } = await runtime;
  await app.ready();
  app.server.emit("request", request, response);
}
