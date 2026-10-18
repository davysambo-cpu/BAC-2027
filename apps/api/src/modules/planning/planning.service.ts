import type {
  CreateRevisionSessionRequest,
  CurrentUser,
  DeleteRevisionSessionRequest,
  RevisionSession,
  RevisionSessionListResponse,
  UpdateRevisionSessionRequest,
} from "@bac-2027/contracts";

import { ApplicationError } from "../../lib/errors";
import type { PlanningRepository } from "./planning.repository";

function matchesCreateRequest(
  session: RevisionSession,
  input: CreateRevisionSessionRequest,
): boolean {
  return (
    session.subjectId === input.subjectId &&
    session.catalogueItemId === input.catalogueItemId &&
    session.title === input.title &&
    session.notes === (input.notes || null) &&
    session.scheduledAt === input.scheduledAt &&
    session.durationMinutes === input.durationMinutes &&
    session.status === "planned"
  );
}

export class PlanningService {
  constructor(
    private readonly repository: PlanningRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(user: CurrentUser): Promise<RevisionSessionListResponse> {
    this.requireStudent(user);
    return {
      generatedAt: this.now().toISOString(),
      sessions: await this.repository.list(user.id),
    };
  }

  async create(user: CurrentUser, input: CreateRevisionSessionRequest): Promise<RevisionSession> {
    const seriesCode = this.requireStudent(user);
    await this.validateSelection(seriesCode, input.subjectId, input.catalogueItemId);
    const result = await this.repository.create({
      ...input,
      studentId: user.id,
      notes: input.notes || null,
      scheduledAt: new Date(input.scheduledAt),
      status: "planned",
      completedAt: null,
    });
    if (result === "identifier_conflict" || !matchesCreateRequest(result, input)) {
      throw new ApplicationError(
        "RESOURCE_VERSION_CONFLICT",
        "Cet identifiant de séance est déjà utilisé. Actualisez le planning avant de réessayer.",
        409,
      );
    }
    return result;
  }

  async update(
    user: CurrentUser,
    sessionId: string,
    input: UpdateRevisionSessionRequest,
  ): Promise<RevisionSession> {
    const seriesCode = this.requireStudent(user);
    await this.validateSelection(seriesCode, input.subjectId, input.catalogueItemId);
    const updatedAt = this.now();
    const result = await this.repository.update({
      ...input,
      id: sessionId,
      studentId: user.id,
      notes: input.notes || null,
      scheduledAt: new Date(input.scheduledAt),
      completedAt: input.status === "completed" ? updatedAt : null,
      updatedAt,
    });
    if (result === "not_found") {
      throw new ApplicationError("NOT_FOUND", "Cette séance est introuvable.", 404);
    }
    if (result === "version_conflict") {
      throw new ApplicationError(
        "RESOURCE_VERSION_CONFLICT",
        "Cette séance a changé sur un autre appareil. Actualisez le planning avant de réessayer.",
        409,
      );
    }
    return result;
  }

  async delete(
    user: CurrentUser,
    sessionId: string,
    input: DeleteRevisionSessionRequest,
  ): Promise<void> {
    this.requireStudent(user);
    const result = await this.repository.delete(user.id, sessionId, input.version, this.now());
    if (result === "not_found") {
      throw new ApplicationError("NOT_FOUND", "Cette séance est introuvable.", 404);
    }
    if (result === "version_conflict") {
      throw new ApplicationError(
        "RESOURCE_VERSION_CONFLICT",
        "Cette séance a changé sur un autre appareil. Actualisez le planning avant de la supprimer.",
        409,
      );
    }
  }

  private async validateSelection(
    seriesCode: string,
    subjectId: string | null,
    catalogueItemId: string | null,
  ): Promise<void> {
    if (subjectId && !(await this.repository.subjectIsVisible(seriesCode, subjectId))) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Cette matière n'est pas disponible dans votre programme.",
        400,
      );
    }
    if (!catalogueItemId) return;
    const topicSubjectId = await this.repository.visibleTopicSubject(seriesCode, catalogueItemId);
    if (!topicSubjectId || topicSubjectId !== subjectId) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Ce thème n'est pas disponible pour la matière choisie.",
        400,
      );
    }
  }

  private requireStudent(user: CurrentUser): string {
    if (user.role !== "student" || !user.seriesCode) {
      throw new ApplicationError(
        "FORBIDDEN",
        "Le planning de révision est réservé à l'espace personnel de l'élève.",
        403,
      );
    }
    return user.seriesCode;
  }
}
