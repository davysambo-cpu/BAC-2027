import type { CurrentUser, StudentCatalogueResponse } from "@bac-2027/contracts";

import { ApplicationError } from "../../lib/errors";
import type { CatalogueRepository } from "./catalogue.repository";

const catalogueNotice =
  "Catalogue pédagogique initial fourni par le porteur du projet. Les entrées sans indication de série restent à confirmer pour la Série D ; les entrées explicitement destinées à une autre série sont masquées.";
const adminCatalogueNotice =
  "Vue administrative du catalogue initial : les entrées explicitement destinées à une autre série restent visibles pour conservation, mais ne sont jamais proposées aux élèves de Série D.";

export class CatalogueService {
  constructor(private readonly repository: CatalogueRepository) {}

  async getStudentCatalogue(seriesCode: string): Promise<StudentCatalogueResponse> {
    const catalogue = await this.repository.findStudentCatalogue(seriesCode);
    if (!catalogue) throw this.notFound(seriesCode);
    return { ...catalogue, notice: catalogueNotice };
  }

  async getAdminCatalogue(
    actor: CurrentUser,
    seriesCode: string,
  ): Promise<StudentCatalogueResponse> {
    if (actor.role !== "admin") {
      throw new ApplicationError(
        "FORBIDDEN",
        "Le catalogue administratif est réservé à l'administration.",
        403,
      );
    }
    const catalogue = await this.repository.findAdminCatalogue(seriesCode);
    if (!catalogue) throw this.notFound(seriesCode);
    return { ...catalogue, notice: adminCatalogueNotice };
  }

  private notFound(seriesCode: string): ApplicationError {
    return new ApplicationError(
      "NOT_FOUND",
      `Aucun catalogue actif n'est disponible pour la Série ${seriesCode}.`,
      404,
    );
  }
}
