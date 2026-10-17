import type { StudentCatalogueResponse } from "@bac-2027/contracts";

import { ApplicationError } from "../../lib/errors";
import type { CatalogueRepository } from "./catalogue.repository";

const catalogueNotice =
  "Catalogue pédagogique initial fourni par le porteur du projet. Les entrées sans indication de série restent à confirmer pour la Série D ; les entrées explicitement destinées à une autre série sont masquées.";

export class CatalogueService {
  constructor(private readonly repository: CatalogueRepository) {}

  async getStudentCatalogue(seriesCode: string): Promise<StudentCatalogueResponse> {
    const catalogue = await this.repository.findStudentCatalogue(seriesCode);
    if (!catalogue) {
      throw new ApplicationError(
        "NOT_FOUND",
        `Aucun catalogue actif n'est disponible pour la Série ${seriesCode}.`,
        404,
      );
    }
    return { ...catalogue, notice: catalogueNotice };
  }
}
