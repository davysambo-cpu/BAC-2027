import { healthResponseSchema } from "@bac-2027/contracts";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "./app";

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("BAC-2027 API", () => {
  it("returns a contract-valid health response", async () => {
    const app = buildApp({ logger: false });
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.safeParse(response.json()).success).toBe(true);
  });

  it("returns a structured 404 error", async () => {
    const app = buildApp({ logger: false });
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/api/unknown" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: {
        code: "NOT_FOUND",
      },
    });
  });
});
