import type {
  CreateDailyReportRequest,
  CurrentUser,
  DailyReport,
  DailyReportListResponse,
} from "@bac-2027/contracts";

import { ApplicationError } from "../../lib/errors";
import type { DailyReportRepository } from "./daily-report.repository";

export class DailyReportService {
  constructor(
    private readonly repository: DailyReportRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(user: CurrentUser, input: CreateDailyReportRequest): Promise<DailyReport> {
    const seriesCode = this.requireStudentSeries(user);
    const selection = await this.repository.validateSelection(
      seriesCode,
      input.subjectId,
      input.catalogueItemId,
      input.chapterId,
    );
    if (!selection.subjectAvailable) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Cette matière n'est pas disponible dans votre catalogue.",
        400,
      );
    }
    if (!selection.catalogueItemAvailable) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Ce thème n'est pas disponible dans le catalogue Série D.",
        400,
      );
    }
    if (!selection.chapterAvailable) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Ce chapitre ne correspond pas à la matière sélectionnée.",
        400,
      );
    }
    return this.repository.create(user.id, input, this.now());
  }

  async list(user: CurrentUser): Promise<DailyReportListResponse> {
    this.requireStudentSeries(user);
    return { reports: await this.repository.listForStudent(user.id) };
  }

  private requireStudentSeries(user: CurrentUser): string {
    if (user.role !== "student" || !user.seriesCode) {
      throw new ApplicationError(
        "FORBIDDEN",
        "Les bilans quotidiens sont réservés aux espaces élèves.",
        403,
      );
    }
    return user.seriesCode;
  }
}
