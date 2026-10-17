import { z } from "zod";

import { isoDateTimeSchema } from "./common";

export const healthStatusSchema = z.enum(["ok", "degraded"]);

export const healthResponseSchema = z.object({
  service: z.literal("bac-2027-api"),
  status: healthStatusSchema,
  version: z.string().min(1),
  timestamp: isoDateTimeSchema,
  environment: z.enum(["development", "test", "production"]),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
