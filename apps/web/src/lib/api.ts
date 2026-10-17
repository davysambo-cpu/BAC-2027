import { healthResponseSchema, type HealthResponse } from "@bac-2027/contracts";

export async function getApiHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const request: RequestInit = {
    headers: { Accept: "application/json" },
  };
  if (signal) request.signal = signal;

  const response = await fetch("/api/health", request);

  if (!response.ok) {
    throw new Error(`API health request failed with status ${response.status}`);
  }

  return healthResponseSchema.parse(await response.json());
}
