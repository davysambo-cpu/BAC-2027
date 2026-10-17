import type {
  CreateTopicRevisionReviewRequest,
  CurrentUser,
  RevisionAssessment,
  RevisionOverview,
  RevisionTopic,
  RevisionTopicStage,
  TopicRevisionReview,
} from "@bac-2027/contracts";

import { ApplicationError } from "../../lib/errors";
import type { RevisionRepository } from "./revision.repository";

const reviewIntervalsInDays: Record<RevisionAssessment, number> = {
  difficult: 1,
  fragile: 3,
  comfortable: 7,
  mastered: 21,
};

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1_000);
}

function topicStage(
  reportCount: number,
  acceptedCourseCount: number,
  latestReview: TopicRevisionReview | null,
): RevisionTopicStage {
  if (latestReview?.assessment === "mastered") return "mastered";
  if (latestReview) return "reviewing";
  if (acceptedCourseCount > 0) return "ready";
  if (reportCount > 0) return "collecting";
  return "not_started";
}

export class RevisionService {
  constructor(
    private readonly repository: RevisionRepository,
    private readonly targetMonth = "2027-07",
    private readonly now: () => Date = () => new Date(),
  ) {}

  async overview(user: CurrentUser): Promise<RevisionOverview> {
    const seriesCode = this.requireStudent(user);
    const generatedAt = this.now();
    const [programTopics, activities, reviews] = await Promise.all([
      this.repository.listProgramTopics(seriesCode),
      this.repository.listReportActivity(user.id),
      this.repository.listReviews(user.id),
    ]);

    const activitiesByTopic = new Map<string, typeof activities>();
    for (const activity of activities) {
      const current = activitiesByTopic.get(activity.catalogueItemId) ?? [];
      current.push(activity);
      activitiesByTopic.set(activity.catalogueItemId, current);
    }

    const reviewsByTopic = new Map<string, TopicRevisionReview[]>();
    for (const review of reviews) {
      const current = reviewsByTopic.get(review.catalogueItemId) ?? [];
      current.push(review);
      reviewsByTopic.set(review.catalogueItemId, current);
    }

    const topics: RevisionTopic[] = programTopics.map((topic) => {
      const topicActivities = activitiesByTopic.get(topic.catalogueItemId) ?? [];
      const topicReviews = reviewsByTopic.get(topic.catalogueItemId) ?? [];
      const latestReview = topicReviews[0] ?? null;
      const acceptedCourseCount = topicActivities.filter(
        (activity) => activity.enrichmentStatus === "accepted",
      ).length;
      const latestLessonDate = topicActivities.reduce<string | null>(
        (latest, activity) =>
          latest === null || activity.lessonDate > latest ? activity.lessonDate : latest,
        null,
      );
      const stage = topicStage(topicActivities.length, acceptedCourseCount, latestReview);
      const isDue = latestReview
        ? new Date(latestReview.nextReviewAt).getTime() <= generatedAt.getTime()
        : acceptedCourseCount > 0;
      return {
        ...topic,
        reportCount: topicActivities.length,
        acceptedCourseCount,
        latestLessonDate,
        reviewCount: topicReviews.length,
        latestReview,
        stage,
        isDue,
      };
    });

    return {
      generatedAt: generatedAt.toISOString(),
      targetMonth: this.targetMonth,
      summary: {
        totalTopics: topics.length,
        startedTopics: topics.filter((topic) => topic.reportCount > 0 || topic.reviewCount > 0)
          .length,
        coursesReady: topics.filter((topic) => topic.acceptedCourseCount > 0).length,
        reviewedTopics: topics.filter((topic) => topic.reviewCount > 0).length,
        masteredTopics: topics.filter((topic) => topic.stage === "mastered").length,
        dueTopics: topics.filter((topic) => topic.isDue).length,
      },
      topics,
    };
  }

  async recordReview(
    user: CurrentUser,
    catalogueItemId: string,
    input: CreateTopicRevisionReviewRequest,
  ): Promise<TopicRevisionReview> {
    const seriesCode = this.requireStudent(user);
    if (!(await this.repository.catalogueItemIsVisible(seriesCode, catalogueItemId))) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Ce thème n'est pas disponible dans votre programme de révision.",
        400,
      );
    }
    const serverNow = this.now();
    const reviewedAt = new Date(input.performedAt);
    if (reviewedAt.getTime() > serverNow.getTime() + 5 * 60 * 1_000) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "L'heure de cette révision est trop éloignée dans le futur. Vérifiez l'heure de l'appareil.",
        400,
      );
    }
    return this.repository.createReview({
      id: input.id,
      studentId: user.id,
      catalogueItemId,
      assessment: input.assessment,
      note: input.note || null,
      reviewedAt,
      nextReviewAt: addUtcDays(reviewedAt, reviewIntervalsInDays[input.assessment]),
    });
  }

  private requireStudent(user: CurrentUser): string {
    if (user.role !== "student" || !user.seriesCode) {
      throw new ApplicationError(
        "FORBIDDEN",
        "Le carnet de révision est réservé à l'espace personnel de l'élève.",
        403,
      );
    }
    return user.seriesCode;
  }
}
