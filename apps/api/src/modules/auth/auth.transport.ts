import type { FastifyRequest } from "fastify";

import type { Environment } from "../../config/env";

export function sessionTokenFromRequest(
  request: FastifyRequest,
  environment: Environment,
): string | undefined {
  if (environment.EMBEDDED_PREVIEW_MODE) {
    const previewHeader = request.headers["x-bac-preview-session"];
    const previewToken = Array.isArray(previewHeader) ? previewHeader[0] : previewHeader;
    request.log.debug(
      {
        hasPreviewSessionHeader: typeof previewToken === "string",
        hasSessionCookie: Boolean(request.cookies[environment.SESSION_COOKIE_NAME]),
      },
      "embedded preview session transport",
    );
    if (
      typeof previewToken === "string" &&
      previewToken.length >= 32 &&
      previewToken.length <= 256
    ) {
      return previewToken;
    }
  }
  return request.cookies[environment.SESSION_COOKIE_NAME];
}
