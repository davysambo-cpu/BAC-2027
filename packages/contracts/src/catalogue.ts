import { z } from "zod";

import { uuidSchema } from "./common";

export const contentValidationStatusSchema = z.enum([
  "owner_provided",
  "pedagogically_validated",
  "institutionally_validated",
  "excluded",
]);

export const seriesScopeStatusSchema = z.enum([
  "explicitly_includes",
  "unspecified",
  "explicitly_excludes",
]);

export const catalogueItemSchema = z.object({
  id: uuidSchema,
  code: z.string().min(1).max(100),
  title: z.string().min(1).max(400),
  section: z.string().min(1).max(80),
  position: z.number().int().nonnegative(),
  sourceUrl: z.string().url().nullable(),
  seriesMention: z.string().max(80).nullable(),
  seriesLabels: z.array(z.string().min(1).max(20)),
  seriesDScope: seriesScopeStatusSchema,
  validationStatus: contentValidationStatusSchema,
  source: z.object({
    title: z.string().min(1).max(240),
    publisher: z.string().max(160).nullable(),
    validationStatus: contentValidationStatusSchema,
  }),
});

export const catalogueSubjectSchema = z.object({
  id: uuidSchema,
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(160),
  position: z.number().int().nonnegative(),
  validationStatus: contentValidationStatusSchema,
  items: z.array(catalogueItemSchema),
});

export const studentCatalogueResponseSchema = z.object({
  series: z.object({
    code: z.string().min(1).max(20),
    name: z.string().min(1).max(160),
  }),
  notice: z.string().min(1),
  subjects: z.array(catalogueSubjectSchema),
});

export type ContentValidationStatus = z.infer<typeof contentValidationStatusSchema>;
export type SeriesScopeStatus = z.infer<typeof seriesScopeStatusSchema>;
export type CatalogueItem = z.infer<typeof catalogueItemSchema>;
export type CatalogueSubject = z.infer<typeof catalogueSubjectSchema>;
export type StudentCatalogueResponse = z.infer<typeof studentCatalogueResponseSchema>;
