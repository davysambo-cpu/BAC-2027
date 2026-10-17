import { and, asc, desc, eq } from "drizzle-orm";

import {
  knowledgeCardSchema,
  type CreateKnowledgeCardRequest,
  type KnowledgeCard,
  type KnowledgeCardContent,
  type KnowledgeCorrectionRule,
  type UpdateKnowledgeCardRequest,
} from "@bac-2027/contracts";

import type { AppDatabase } from "../../db/client";
import { adminAuditLogs, catalogueItems, knowledgeCards, subjects } from "../../db/schema";

export type KnowledgeCardUpdateResult = "not_found" | "version_conflict" | KnowledgeCard;

export interface KnowledgeRepository {
  catalogueItemExists(catalogueItemId: string): Promise<boolean>;
  list(): Promise<KnowledgeCard[]>;
  findPublishedForCatalogueItem(catalogueItemId: string): Promise<KnowledgeCard | null>;
  create(
    actorId: string,
    input: CreateKnowledgeCardRequest,
    now: Date,
  ): Promise<KnowledgeCard | null>;
  update(
    cardId: string,
    actorId: string,
    input: UpdateKnowledgeCardRequest,
    now: Date,
  ): Promise<KnowledgeCardUpdateResult>;
}

const selection = {
  id: knowledgeCards.id,
  catalogueItemId: knowledgeCards.catalogueItemId,
  subjectId: catalogueItems.subjectId,
  subjectName: subjects.name,
  catalogueItemTitle: catalogueItems.title,
  title: knowledgeCards.title,
  status: knowledgeCards.status,
  trustTier: knowledgeCards.trustTier,
  sourceTitle: knowledgeCards.sourceTitle,
  sourcePublisher: knowledgeCards.sourcePublisher,
  sourceUrl: knowledgeCards.sourceUrl,
  sourceExcerpt: knowledgeCards.sourceExcerpt,
  content: knowledgeCards.content,
  correctionRules: knowledgeCards.correctionRules,
  version: knowledgeCards.version,
  createdAt: knowledgeCards.createdAt,
  updatedAt: knowledgeCards.updatedAt,
  publishedAt: knowledgeCards.publishedAt,
};

interface KnowledgeRow {
  id: string;
  catalogueItemId: string;
  subjectId: string;
  subjectName: string;
  catalogueItemTitle: string;
  title: string;
  status: "draft" | "published" | "archived";
  trustTier: "institutional" | "curated" | "catalogue" | "web";
  sourceTitle: string;
  sourcePublisher: string;
  sourceUrl: string | null;
  sourceExcerpt: string;
  content: KnowledgeCardContent;
  correctionRules: KnowledgeCorrectionRule[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

function mapCard(row: KnowledgeRow): KnowledgeCard {
  return knowledgeCardSchema.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  });
}

export class DrizzleKnowledgeRepository implements KnowledgeRepository {
  constructor(private readonly database: AppDatabase) {}

  async catalogueItemExists(catalogueItemId: string): Promise<boolean> {
    const [item] = await this.database
      .select({ id: catalogueItems.id })
      .from(catalogueItems)
      .where(and(eq(catalogueItems.id, catalogueItemId), eq(catalogueItems.isActive, true)))
      .limit(1);
    return Boolean(item);
  }

  async list(): Promise<KnowledgeCard[]> {
    const rows = await this.database
      .select(selection)
      .from(knowledgeCards)
      .innerJoin(catalogueItems, eq(catalogueItems.id, knowledgeCards.catalogueItemId))
      .innerJoin(subjects, eq(subjects.id, catalogueItems.subjectId))
      .orderBy(
        asc(subjects.position),
        asc(catalogueItems.subjectPosition),
        desc(knowledgeCards.updatedAt),
      );
    return rows.map(mapCard);
  }

  async findPublishedForCatalogueItem(catalogueItemId: string): Promise<KnowledgeCard | null> {
    const [row] = await this.database
      .select(selection)
      .from(knowledgeCards)
      .innerJoin(catalogueItems, eq(catalogueItems.id, knowledgeCards.catalogueItemId))
      .innerJoin(subjects, eq(subjects.id, catalogueItems.subjectId))
      .where(
        and(
          eq(knowledgeCards.catalogueItemId, catalogueItemId),
          eq(knowledgeCards.status, "published"),
          eq(catalogueItems.isActive, true),
        ),
      )
      .limit(1);
    return row ? mapCard(row) : null;
  }

  async create(
    actorId: string,
    input: CreateKnowledgeCardRequest,
    now: Date,
  ): Promise<KnowledgeCard | null> {
    const createdId = await this.database.transaction(async (transaction) => {
      const [created] = await transaction
        .insert(knowledgeCards)
        .values({
          catalogueItemId: input.catalogueItemId,
          title: input.title,
          status: input.status,
          trustTier: input.trustTier,
          sourceTitle: input.sourceTitle,
          sourcePublisher: input.sourcePublisher,
          sourceUrl: input.sourceUrl,
          sourceExcerpt: input.sourceExcerpt,
          content: input.content,
          correctionRules: input.correctionRules,
          createdBy: actorId,
          updatedBy: actorId,
          updatedAt: now,
          publishedAt: input.status === "published" ? now : null,
        })
        .onConflictDoNothing({ target: knowledgeCards.catalogueItemId })
        .returning({ id: knowledgeCards.id });
      if (!created) return null;
      await transaction.insert(adminAuditLogs).values({
        actorId,
        action:
          input.status === "published" ? "knowledge_card.published" : "knowledge_card.created",
        targetType: "knowledge_card",
        targetId: created.id,
        metadata: {
          catalogueItemId: input.catalogueItemId,
          status: input.status,
          version: 1,
        },
      });
      return created.id;
    });
    return createdId ? this.findById(createdId) : null;
  }

  async update(
    cardId: string,
    actorId: string,
    input: UpdateKnowledgeCardRequest,
    now: Date,
  ): Promise<KnowledgeCardUpdateResult> {
    const [existing] = await this.database
      .select({
        version: knowledgeCards.version,
        status: knowledgeCards.status,
        publishedAt: knowledgeCards.publishedAt,
      })
      .from(knowledgeCards)
      .where(eq(knowledgeCards.id, cardId))
      .limit(1);
    if (!existing) return "not_found";
    if (existing.version !== input.version) return "version_conflict";

    const updatedId = await this.database.transaction(async (transaction) => {
      const [updated] = await transaction
        .update(knowledgeCards)
        .set({
          catalogueItemId: input.catalogueItemId,
          title: input.title,
          status: input.status,
          trustTier: input.trustTier,
          sourceTitle: input.sourceTitle,
          sourcePublisher: input.sourcePublisher,
          sourceUrl: input.sourceUrl,
          sourceExcerpt: input.sourceExcerpt,
          content: input.content,
          correctionRules: input.correctionRules,
          version: input.version + 1,
          updatedBy: actorId,
          updatedAt: now,
          publishedAt: input.status === "published" ? (existing.publishedAt ?? now) : null,
        })
        .where(and(eq(knowledgeCards.id, cardId), eq(knowledgeCards.version, input.version)))
        .returning({ id: knowledgeCards.id });
      if (!updated) return null;
      await transaction.insert(adminAuditLogs).values({
        actorId,
        action:
          input.status === "published" && existing.status !== "published"
            ? "knowledge_card.published"
            : input.status === "archived" && existing.status !== "archived"
              ? "knowledge_card.archived"
              : "knowledge_card.updated",
        targetType: "knowledge_card",
        targetId: updated.id,
        metadata: {
          catalogueItemId: input.catalogueItemId,
          status: input.status,
          version: input.version + 1,
        },
      });
      return updated.id;
    });
    if (!updatedId) return "version_conflict";
    return (await this.findById(updatedId)) ?? "not_found";
  }

  private async findById(cardId: string): Promise<KnowledgeCard | null> {
    const [row] = await this.database
      .select(selection)
      .from(knowledgeCards)
      .innerJoin(catalogueItems, eq(catalogueItems.id, knowledgeCards.catalogueItemId))
      .innerJoin(subjects, eq(subjects.id, catalogueItems.subjectId))
      .where(eq(knowledgeCards.id, cardId))
      .limit(1);
    return row ? mapCard(row) : null;
  }
}
