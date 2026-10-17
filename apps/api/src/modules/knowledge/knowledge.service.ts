import type {
  CreateKnowledgeCardRequest,
  CurrentUser,
  KnowledgeCard,
  KnowledgeCardListResponse,
  UpdateKnowledgeCardRequest,
} from "@bac-2027/contracts";

import { ApplicationError } from "../../lib/errors";
import type { KnowledgeRepository } from "./knowledge.repository";

export class KnowledgeService {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(actor: CurrentUser): Promise<KnowledgeCardListResponse> {
    this.requireAdmin(actor);
    return { cards: await this.repository.list() };
  }

  async create(actor: CurrentUser, input: CreateKnowledgeCardRequest): Promise<KnowledgeCard> {
    this.requireAdmin(actor);
    await this.requireCatalogueItem(input.catalogueItemId);
    const created = await this.repository.create(actor.id, input, this.now());
    if (!created) {
      throw new ApplicationError(
        "RESOURCE_VERSION_CONFLICT",
        "Une fiche de savoir existe déjà pour ce thème. Modifiez la fiche existante.",
        409,
      );
    }
    return created;
  }

  async update(
    actor: CurrentUser,
    cardId: string,
    input: UpdateKnowledgeCardRequest,
  ): Promise<KnowledgeCard> {
    this.requireAdmin(actor);
    const current = (await this.repository.list()).find((card) => card.id === cardId);
    if (!current) throw this.notFound();
    if (current.catalogueItemId !== input.catalogueItemId) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Le thème d'une fiche existante ne peut pas être remplacé.",
        400,
      );
    }
    await this.requireCatalogueItem(input.catalogueItemId);
    const updated = await this.repository.update(cardId, actor.id, input, this.now());
    if (updated === "not_found") throw this.notFound();
    if (updated === "version_conflict") {
      throw new ApplicationError(
        "RESOURCE_VERSION_CONFLICT",
        "Cette fiche a été modifiée ailleurs. Rechargez-la avant de recommencer.",
        409,
      );
    }
    return updated;
  }

  private async requireCatalogueItem(catalogueItemId: string): Promise<void> {
    if (!(await this.repository.catalogueItemExists(catalogueItemId))) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Le thème choisi n'existe pas dans le catalogue.",
        400,
      );
    }
  }

  private requireAdmin(actor: CurrentUser): void {
    if (actor.role !== "admin") {
      throw new ApplicationError(
        "FORBIDDEN",
        "La publication des fiches de savoir est réservée à l'administration.",
        403,
      );
    }
  }

  private notFound(): ApplicationError {
    return new ApplicationError("NOT_FOUND", "Cette fiche de savoir est introuvable.", 404);
  }
}
