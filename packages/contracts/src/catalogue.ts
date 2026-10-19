import { z } from "zod";

import { isoDateTimeSchema, uuidSchema } from "./common";

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

export const catalogueValidationLevelSchema = z.enum([
  "pedagogically_validated",
  "institutionally_validated",
]);

export const catalogueSeriesDecisionSchema = z.enum(["confirmed", "excluded", "pending"]);

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
  sourceSeriesDScope: seriesScopeStatusSchema,
  adminSeriesDDecision: z.enum(["explicitly_includes", "explicitly_excludes"]).nullable(),
  validationStatus: contentValidationStatusSchema,
  validationNote: z.string().max(1_000).nullable(),
  validationSourceUrl: z.string().url().nullable(),
  validatedAt: isoDateTimeSchema.nullable(),
  validationVersion: z.number().int().positive(),
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

const catalogueValidationEvidenceSchema = z.object({
  justification: z.string().trim().min(10).max(1_000),
  sourceUrl: z.string().trim().url().nullable().default(null),
});

export const updateCatalogueItemValidationRequestSchema = catalogueValidationEvidenceSchema
  .extend({
    decision: catalogueSeriesDecisionSchema,
    validationLevel: catalogueValidationLevelSchema.nullable(),
    version: z.number().int().positive(),
  })
  .superRefine((value, context) => {
    if (value.decision === "confirmed" && !value.validationLevel) {
      context.addIssue({
        code: "custom",
        path: ["validationLevel"],
        message: "Choisissez le niveau de validation de cette confirmation.",
      });
    }
    if (value.decision === "pending" && value.validationLevel) {
      context.addIssue({
        code: "custom",
        path: ["validationLevel"],
        message: "Un thème laissé à confirmer ne possède pas encore de niveau de validation.",
      });
    }
    if (value.validationLevel === "institutionally_validated" && !value.sourceUrl) {
      context.addIssue({
        code: "custom",
        path: ["sourceUrl"],
        message: "Ajoutez le lien de la source officielle utilisée.",
      });
    }
  });

export const confirmCatalogueItemsRequestSchema = catalogueValidationEvidenceSchema
  .extend({
    subjectId: uuidSchema.nullable().default(null),
    validationLevel: catalogueValidationLevelSchema,
  })
  .superRefine((value, context) => {
    if (value.validationLevel === "institutionally_validated" && !value.sourceUrl) {
      context.addIssue({
        code: "custom",
        path: ["sourceUrl"],
        message: "Ajoutez le lien de la source officielle utilisée.",
      });
    }
  });

export const catalogueValidationResultSchema = z.object({
  itemId: uuidSchema,
  decision: catalogueSeriesDecisionSchema,
  validationStatus: contentValidationStatusSchema,
  version: z.number().int().positive(),
  validatedAt: isoDateTimeSchema,
});

export const catalogueBulkConfirmationResultSchema = z.object({
  updatedItems: z.number().int().nonnegative(),
  updatedSubjects: z.number().int().nonnegative(),
  validatedAt: isoDateTimeSchema,
});

export type ContentValidationStatus = z.infer<typeof contentValidationStatusSchema>;
export type SeriesScopeStatus = z.infer<typeof seriesScopeStatusSchema>;
export type CatalogueValidationLevel = z.infer<typeof catalogueValidationLevelSchema>;
export type CatalogueSeriesDecision = z.infer<typeof catalogueSeriesDecisionSchema>;
export type CatalogueItem = z.infer<typeof catalogueItemSchema>;
export type CatalogueSubject = z.infer<typeof catalogueSubjectSchema>;
export type StudentCatalogueResponse = z.infer<typeof studentCatalogueResponseSchema>;
export type UpdateCatalogueItemValidationRequest = z.infer<
  typeof updateCatalogueItemValidationRequestSchema
>;
export type ConfirmCatalogueItemsRequest = z.infer<typeof confirmCatalogueItemsRequestSchema>;
export type CatalogueValidationResult = z.infer<typeof catalogueValidationResultSchema>;
export type CatalogueBulkConfirmationResult = z.infer<typeof catalogueBulkConfirmationResultSchema>;
