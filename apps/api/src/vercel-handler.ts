import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import { eq } from "drizzle-orm";

import { environment } from "./config/env";
import { revisionSessions } from "./db/schema";
import { createApiRuntime } from "./runtime";

let runtime: ReturnType<typeof createApiRuntime> | undefined;

function runtimeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown runtime initialization error.";
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    runtime ??= createApiRuntime();
    const { app } = await runtime;
    await app.ready();
    app.server.emit("request", request, response);
  } catch (error) {
    runtime = undefined;
    console.error("Unable to initialize the BAC-2027 API runtime.", error);
    if (response.headersSent) {
      response.destroy(error instanceof Error ? error : undefined);
      return;
    }
    response.statusCode = 503;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(
      JSON.stringify({
        error: "api_runtime_unavailable",
        ...(process.env.PILOT_MODE === "true" ? { detail: runtimeErrorMessage(error) } : {}),
      }),
    );
  }
}

/** Temporary, side-effect-clean smoke test exposed only through the pilot diagnostic function. */
export async function runPilotSmokeTest() {
  if (!environment.PILOT_MODE || !environment.PILOT_STUDENT_PASSWORD) {
    throw new Error("Pilot smoke testing is disabled.");
  }

  const smokeSessionId = randomUUID();
  const smokeSessionDetails = {
    subjectId: null,
    catalogueItemId: null,
    title: "Vérification technique temporaire",
    notes: "Cette séance est supprimée automatiquement après la vérification.",
    scheduledAt: "2027-06-30T16:00:00.000Z",
    durationMinutes: 15,
  };
  const smokeRuntime = await createApiRuntime(environment, { logger: false });
  let sessionCreated = false;
  let authToken: string | null = null;

  try {
    await smokeRuntime.app.ready();
    const authentication = await smokeRuntime.services.authService.login({
      username: "recette6",
      password: environment.PILOT_STUDENT_PASSWORD,
      deviceType: "shared",
    });
    authToken = authentication.sessionToken;
    const authenticatedSession = await smokeRuntime.services.authService.authenticate(authToken);
    const user = authenticatedSession.user;

    const catalogue = await smokeRuntime.services.catalogueService.getStudentCatalogue(
      user.seriesCode ?? "D",
    );
    const planning = await smokeRuntime.services.planningService.list(user);
    const created = await smokeRuntime.services.planningService.create(user, {
      id: smokeSessionId,
      ...smokeSessionDetails,
    });
    sessionCreated = true;

    const completed = await smokeRuntime.services.planningService.update(user, smokeSessionId, {
      ...smokeSessionDetails,
      version: created.version,
      status: "completed",
    });
    if (completed.status !== "completed" || !completed.completedAt) {
      throw new Error("Planning completion did not persist the completed status.");
    }

    await smokeRuntime.services.planningService.delete(user, smokeSessionId, {
      version: completed.version,
    });
    sessionCreated = false;
    await smokeRuntime.services.authService.logout(authToken);
    authToken = null;

    return {
      status: "ok" as const,
      checks: {
        authentication: true,
        profile: authenticatedSession.preferences.dailyRevisionGoalMinutes > 0,
        catalogue: true,
        planningList: true,
        planningCreate: true,
        planningComplete: true,
        planningDelete: true,
        logout: true,
      },
      catalogueItems: catalogue.subjects.reduce(
        (total, subject) => total + subject.items.length,
        0,
      ),
      planningSessions: planning.sessions.length,
    };
  } finally {
    if (sessionCreated) {
      await smokeRuntime.connection.database
        .delete(revisionSessions)
        .where(eq(revisionSessions.id, smokeSessionId))
        .catch(() => undefined);
    }
    if (authToken) {
      await smokeRuntime.services.authService.logout(authToken).catch(() => undefined);
    }
    await smokeRuntime.app.close().catch(() => undefined);
    await smokeRuntime.connection.close().catch(() => undefined);
  }
}
