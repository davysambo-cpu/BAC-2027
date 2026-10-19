import type {
  CatalogueBulkConfirmationResult,
  CatalogueValidationResult,
  ConfirmCatalogueItemsRequest,
  CurrentUser,
  StudentCatalogueResponse,
  UpdateCatalogueItemValidationRequest,
} from "@bac-2027/contracts";

import { ApplicationError } from "../../lib/errors";
import type { CatalogueRepository } from "./catalogue.repository";

const catalogueNotice =
  "Catalogue pédagogique fourni pour la Série D. Les confirmations administratives sont distinguées des mentions présentes dans les sources et ne constituent une validation institutionnelle que lorsqu'une source officielle est enregistrée.";
const adminCatalogueNotice =
  "Vue administrative complète : confirmez uniquement avec une justification, conservez les mentions originales et laissez masquées les entrées explicitement destinées à une autre série.";

export class CatalogueService {
  constructor(
    private readonly repository: CatalogueRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getStudentCatalogue(seriesCode: string): Promise<StudentCatalogueResponse> {
    const catalogue = await this.repository.findStudentCatalogue(seriesCode);
    if (!catalogue) throw this.notFound(seriesCode);
    return { ...catalogue, notice: catalogueNotice };
  }

  async getAdminCatalogue(
    actor: CurrentUser,
    seriesCode: string,
  ): Promise<StudentCatalogueResponse> {
    this.requireAdmin(actor);
    const catalogue = await this.repository.findAdminCatalogue(seriesCode);
    if (!catalogue) throw this.notFound(seriesCode);
    return { ...catalogue, notice: adminCatalogueNotice };
  }

  async updateItemValidation(
    actor: CurrentUser,
    itemId: string,
    input: UpdateCatalogueItemValidationRequest,
    requestId?: string,
  ): Promise<CatalogueValidationResult> {
    this.requireAdmin(actor);
    const result = await this.repository.updateItemValidation(
      actor.id,
      itemId,
      input,
      this.now(),
      requestId,
    );
    if (result === "not_found") {
      throw new ApplicationError("NOT_FOUND", "Ce thème du catalogue est introuvable.", 404);
    }
    if (result === "version_conflict") {
      throw new ApplicationError(
        "RESOURCE_VERSION_CONFLICT",
        "Cette validation a été modifiée ailleurs. Actualisez le catalogue avant de recommencer.",
        409,
      );
    }
    return result;
  }

  async confirmVisibleItems(
    actor: CurrentUser,
    input: ConfirmCatalogueItemsRequest,
    requestId?: string,
  ): Promise<CatalogueBulkConfirmationResult> {
    this.requireAdmin(actor);
    return this.repository.confirmVisibleItems(actor.id, "D", input, this.now(), requestId);
  }

  private requireAdmin(actor: CurrentUser): void {
    if (actor.role !== "admin") {
      throw new ApplicationError(
        "FORBIDDEN",
        "La validation du catalogue est réservée à l'administration.",
        403,
      );
    }
  }

  private notFound(seriesCode: string): ApplicationError {
    return new ApplicationError(
      "NOT_FOUND",
      `Aucun catalogue actif n'est disponible pour la Série ${seriesCode}.`,
      404,
    );
  }
}
