import { z } from "zod";

import { citedSourceUrlSchema } from "./daily-reports";
import { isoDateTimeSchema, uuidSchema } from "./common";

export const knowledgeCardStatusSchema = z.enum(["draft", "published", "archived"]);
export const approvedSourceTrustTierSchema = z.enum(["institutional", "curated"]);

export const knowledgeDefinitionSchema = z.object({
  term: z.string().trim().min(1).max(200),
  explanation: z.string().trim().min(1).max(2_000),
});

export const knowledgeCorrectionRuleSchema = z.object({
  trigger: z.string().trim().min(3).max(500),
  proposedText: z.string().trim().min(3).max(4_000),
  explanation: z.string().trim().min(3).max(4_000),
});

export const knowledgeCardContentSchema = z.object({
  objectives: z.array(z.string().trim().min(3).max(500)).min(1).max(12),
  synthesis: z.string().trim().min(20).max(30_000),
  definitions: z.array(knowledgeDefinitionSchema).max(30).default([]),
  explanations: z.array(z.string().trim().min(3).max(4_000)).min(1).max(30),
  examples: z.array(z.string().trim().min(3).max(4_000)).max(20).default([]),
});

const knowledgeCardFieldsSchema = z.object({
  catalogueItemId: uuidSchema,
  title: z.string().trim().min(3).max(240),
  status: knowledgeCardStatusSchema,
  trustTier: approvedSourceTrustTierSchema,
  sourceTitle: z.string().trim().min(3).max(300),
  sourcePublisher: z.string().trim().min(2).max(200),
  sourceUrl: citedSourceUrlSchema.nullable().default(null),
  sourceExcerpt: z.string().trim().min(20).max(8_000),
  content: knowledgeCardContentSchema,
  correctionRules: z.array(knowledgeCorrectionRuleSchema).max(30).default([]),
});

export const createKnowledgeCardRequestSchema = knowledgeCardFieldsSchema.superRefine(
  (value, context) => {
    const triggers = value.correctionRules.map((rule) => rule.trigger.toLocaleLowerCase("fr"));
    if (new Set(triggers).size !== triggers.length) {
      context.addIssue({
        code: "custom",
        path: ["correctionRules"],
        message: "Chaque expression à vérifier doit être unique.",
      });
    }
  },
);

export const updateKnowledgeCardRequestSchema = createKnowledgeCardRequestSchema.and(
  z.object({ version: z.number().int().positive() }),
);

export const knowledgeCardSchema = knowledgeCardFieldsSchema.extend({
  id: uuidSchema,
  subjectId: uuidSchema,
  subjectName: z.string().min(1).max(160),
  catalogueItemTitle: z.string().min(1).max(400),
  version: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  publishedAt: isoDateTimeSchema.nullable(),
});

export const knowledgeCardListResponseSchema = z.object({
  cards: z.array(knowledgeCardSchema),
});

export type KnowledgeCardStatus = z.infer<typeof knowledgeCardStatusSchema>;
export type ApprovedSourceTrustTier = z.infer<typeof approvedSourceTrustTierSchema>;
export type KnowledgeDefinition = z.infer<typeof knowledgeDefinitionSchema>;
export type KnowledgeCorrectionRule = z.infer<typeof knowledgeCorrectionRuleSchema>;
export type KnowledgeCardContent = z.infer<typeof knowledgeCardContentSchema>;
export type CreateKnowledgeCardRequest = z.infer<typeof createKnowledgeCardRequestSchema>;
export type UpdateKnowledgeCardRequest = z.infer<typeof updateKnowledgeCardRequestSchema>;
export type KnowledgeCard = z.infer<typeof knowledgeCardSchema>;
export type KnowledgeCardListResponse = z.infer<typeof knowledgeCardListResponseSchema>;
