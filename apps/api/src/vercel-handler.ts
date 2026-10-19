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

function requireStatus(actual: number, expected: number, step: string): void {
  if (actual !== expected) {
    throw new Error(`${step} returned HTTP ${actual} instead of ${expected}.`);
  }
}

/** Temporary, side-effect-clean smoke test exposed only through the pilot diagnostic function. */
export async function runPilotSmokeTest() {
  if (!environment.PILOT_MODE || !environment.PILOT_STUDENT_PASSWORD) {
    throw new Error("Pilot smoke testing is disabled.");
  }

  const smokeSessionId = randomUUID();
  const smokeSession = {
    id: smokeSessionId,
    subjectId: null,
    catalogueItemId: null,
    title: "Vérification technique temporaire",
    notes: "Cette séance est supprimée automatiquement après la vérification.",
    scheduledAt: "2027-06-30T16:00:00.000Z",
    durationMinutes: 15,
  };
  const smokeRuntime = await createApiRuntime(environment, { logger: false });
  let sessionCreated = false;

  try {
    await smokeRuntime.app.ready();
    const login = await smokeRuntime.app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        username: "recette6",
        password: environment.PILOT_STUDENT_PASSWORD,
        deviceType: "shared",
      },
    });
    requireStatus(login.statusCode, 200, "login");

    const setCookie = login.headers["set-cookie"];
    const cookieHeader = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";", 1)[0];
    if (!cookieHeader) throw new Error("Login did not return a session cookie.");
    const authenticatedHeaders = { cookie: cookieHeader };
    const planningWriteHeaders = { ...authenticatedHeaders, "x-bac-planning": "1" };

    const profile = await smokeRuntime.app.inject({
      method: "GET",
      url: "/api/v1/profile",
      headers: authenticatedHeaders,
    });
    requireStatus(profile.statusCode, 200, "profile");

    const catalogue = await smokeRuntime.app.inject({
      method: "GET",
      url: "/api/v1/catalogue",
      headers: authenticatedHeaders,
    });
    requireStatus(catalogue.statusCode, 200, "catalogue");
    const catalogueBody = catalogue.json<{
      subjects: Array<{ items: unknown[] }>;
    }>();

    const planning = await smokeRuntime.app.inject({
      method: "GET",
      url: "/api/v1/planning/sessions",
      headers: authenticatedHeaders,
    });
    requireStatus(planning.statusCode, 200, "planning list");
    const planningBody = planning.json<{ sessions: unknown[] }>();

    const created = await smokeRuntime.app.inject({
      method: "POST",
      url: "/api/v1/planning/sessions",
      headers: planningWriteHeaders,
      payload: smokeSession,
    });
    requireStatus(created.statusCode, 201, "planning create");
    sessionCreated = true;
    const createdBody = created.json<typeof smokeSession & { version: number }>();

    const completed = await smokeRuntime.app.inject({
      method: "PATCH",
      url: `/api/v1/planning/sessions/${smokeSessionId}`,
      headers: planningWriteHeaders,
      payload: {
        ...smokeSession,
        version: createdBody.version,
        status: "completed",
      },
    });
    requireStatus(completed.statusCode, 200, "planning completion");
    const completedBody = completed.json<{ version: number; status: string }>();
    if (completedBody.status !== "completed") {
      throw new Error("Planning completion did not persist the completed status.");
    }

    const deleted = await smokeRuntime.app.inject({
      method: "DELETE",
      url: `/api/v1/planning/sessions/${smokeSessionId}`,
      headers: planningWriteHeaders,
      payload: { version: completedBody.version },
    });
    requireStatus(deleted.statusCode, 204, "planning delete");
    sessionCreated = false;

    const logout = await smokeRuntime.app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: authenticatedHeaders,
    });
    requireStatus(logout.statusCode, 204, "logout");

    return {
      status: "ok" as const,
      checks: {
        authentication: true,
        profile: true,
        catalogue: true,
        planningList: true,
        planningCreate: true,
        planningComplete: true,
        planningDelete: true,
        logout: true,
      },
      catalogueItems: catalogueBody.subjects.reduce(
        (total, subject) => total + subject.items.length,
        0,
      ),
      planningSessions: planningBody.sessions.length,
    };
  } finally {
    if (sessionCreated) {
      await smokeRuntime.connection.database
        .delete(revisionSessions)
        .where(eq(revisionSessions.id, smokeSessionId))
        .catch(() => undefined);
    }
    await smokeRuntime.app.close().catch(() => undefined);
    await smokeRuntime.connection.close().catch(() => undefined);
  }
}
