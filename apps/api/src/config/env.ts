import { resolve } from "node:path";

import { config as loadDotEnv } from "dotenv";
import { z } from "zod";

loadDotEnv({
  path: resolve(process.env.INIT_CWD ?? process.cwd(), ".env"),
  quiet: true,
});

const booleanFromEnvironment = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().min(1).default("0.0.0.0"),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    DATABASE_DRIVER: z.enum(["postgres", "pglite"]).default("pglite"),
    DATABASE_URL: z
      .string()
      .min(1)
      .default("postgresql://bac2027:bac2027_dev@localhost:5432/bac2027"),
    PGLITE_DATA_DIR: z.string().min(1).default("../../.data/pglite"),
    AUTH_TOKEN_SECRET: z.string().min(32).default("bac-2027-development-token-secret-change-me"),
    SESSION_COOKIE_NAME: z.string().min(1).default("bac2027_session"),
    EMBEDDED_PREVIEW_MODE: booleanFromEnvironment,
    INVITATION_TTL_HOURS: z.coerce.number().int().positive().default(72),
    RESET_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(30),
    PERSONAL_SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
    SHARED_SESSION_TTL_HOURS: z.coerce.number().int().positive().default(8),
    REVISION_TARGET_MONTH: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .default("2027-07"),
    MEDIA_STORAGE_DRIVER: z.enum(["filesystem", "s3"]).default("filesystem"),
    MEDIA_STORAGE_DIR: z.string().min(1).default("../../.data/uploads"),
    OBJECT_STORAGE_ENDPOINT: z.string().url().default("http://localhost:9000"),
    OBJECT_STORAGE_REGION: z.string().min(1).default("auto"),
    OBJECT_STORAGE_BUCKET: z.string().min(1).default("bac-2027-dev"),
    OBJECT_STORAGE_ACCESS_KEY: z.string().min(1).default("replace-me"),
    OBJECT_STORAGE_SECRET_KEY: z.string().min(1).default("replace-me"),
    OBJECT_STORAGE_FORCE_PATH_STYLE: booleanFromEnvironment,
    DEFAULT_USER_STORAGE_QUOTA_MB: z.coerce.number().int().positive().default(250),
    MAX_DOCUMENT_SIZE_MB: z.coerce.number().int().positive().default(25),
    MAX_IMAGE_SIZE_MB: z.coerce.number().int().positive().default(5),
    MAX_AUDIO_SIZE_MB: z.coerce.number().int().positive().default(10),
    MAX_VIDEO_SIZE_MB: z.coerce.number().int().positive().default(150),
    MAX_DAILY_REPORT_IMAGES: z.coerce.number().int().min(1).max(5).default(2),
    MAX_DAILY_REPORT_AUDIO: z.coerce.number().int().min(1).max(2).default(1),
    SEED_DEMO_DATA: booleanFromEnvironment,
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== "production") return;
    if (value.DATABASE_DRIVER !== "postgres") {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_DRIVER"],
        message: "Production requires the PostgreSQL driver.",
      });
    }
    if (value.EMBEDDED_PREVIEW_MODE) {
      context.addIssue({
        code: "custom",
        path: ["EMBEDDED_PREVIEW_MODE"],
        message: "Embedded preview authentication is forbidden in production.",
      });
    }
    if (value.DATABASE_URL === "postgresql://bac2027:bac2027_dev@localhost:5432/bac2027") {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "Production requires an explicitly configured PostgreSQL URL.",
      });
    }
    if (value.AUTH_TOKEN_SECRET === "bac-2027-development-token-secret-change-me") {
      context.addIssue({
        code: "custom",
        path: ["AUTH_TOKEN_SECRET"],
        message: "Production requires a unique authentication token secret.",
      });
    }
    if (value.MEDIA_STORAGE_DRIVER !== "s3") {
      context.addIssue({
        code: "custom",
        path: ["MEDIA_STORAGE_DRIVER"],
        message: "Production requires S3-compatible object storage.",
      });
    }
    if (
      value.OBJECT_STORAGE_ACCESS_KEY === "replace-me" ||
      value.OBJECT_STORAGE_SECRET_KEY === "replace-me"
    ) {
      context.addIssue({
        code: "custom",
        path: ["OBJECT_STORAGE_ACCESS_KEY"],
        message: "Production requires explicitly configured object-storage credentials.",
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function readEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  return environmentSchema.parse(source);
}

export const environment = readEnvironment();
