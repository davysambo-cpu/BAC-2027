import type { ErrorCode } from "@bac-2027/contracts";

export class ApplicationError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
    this.statusCode = statusCode;
    if (details) this.details = details;
  }
}
