import {
  adminUserListResponseSchema,
  apiErrorSchema,
  authResponseSchema,
  currentSessionResponseSchema,
  courseDraftSchema,
  currentUserSchema,
  dailyReportAttachmentListResponseSchema,
  dailyReportAttachmentSchema,
  dailyReportListResponseSchema,
  dailyReportSchema,
  invitationResponseSchema,
  knowledgeCardListResponseSchema,
  knowledgeCardSchema,
  profileResponseSchema,
  resetCodeResponseSchema,
  studentCatalogueResponseSchema,
  type ActivateInvitationRequest,
  type AuthResponse,
  type CompletePasswordResetRequest,
  type CourseDraft,
  type CreateDailyReportRequest,
  type CreateInvitationRequest,
  type CreateKnowledgeCardRequest,
  type CurrentUser,
  type DailyReport,
  type DailyReportAttachment,
  type DailyReportAttachmentKind,
  type DailyReportAttachmentListResponse,
  type DailyReportListResponse,
  type KnowledgeCard,
  type KnowledgeCardListResponse,
  type LoginRequest,
  type ProfileResponse,
  type ReviewDraftCorrectionRequest,
  type StudentCatalogueResponse,
  type UpdateKnowledgeCardRequest,
  type UpdateProfileRequest,
} from "@bac-2027/contracts";
import type { z } from "zod";

let inMemorySessionAccessToken: string | null = null;

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (inMemorySessionAccessToken) {
    headers.set("X-BAC-Preview-Session", inMemorySessionAccessToken);
  }

  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) inMemorySessionAccessToken = null;
    const body: unknown = await response.json().catch(() => null);
    const parsed = apiErrorSchema.safeParse(body);
    throw new ApiClientError(
      response.status,
      parsed.success ? parsed.data.error.code : "INTERNAL_ERROR",
      parsed.success ? parsed.data.error.message : "Le service est temporairement indisponible.",
    );
  }

  return schema.parse(await response.json());
}

async function authenticate(
  path: string,
  input: LoginRequest | ActivateInvitationRequest | CompletePasswordResetRequest,
): Promise<AuthResponse> {
  inMemorySessionAccessToken = null;
  const authentication = await request(path, authResponseSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
  inMemorySessionAccessToken = authentication.sessionAccessToken ?? null;
  return authentication;
}

export function login(input: LoginRequest): Promise<AuthResponse> {
  return authenticate("/api/v1/auth/login", input);
}

export function activateInvitation(input: ActivateInvitationRequest): Promise<AuthResponse> {
  return authenticate("/api/v1/auth/activate", input);
}

export function completePasswordReset(input: CompletePasswordResetRequest): Promise<AuthResponse> {
  return authenticate("/api/v1/auth/reset/complete", input);
}

export function getCurrentSession(): Promise<AuthResponse> {
  return request("/api/v1/auth/me", currentSessionResponseSchema);
}

export async function logout(): Promise<void> {
  const headers = new Headers();
  if (inMemorySessionAccessToken) {
    headers.set("X-BAC-Preview-Session", inMemorySessionAccessToken);
  }
  try {
    const response = await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers,
    });
    if (!response.ok && response.status !== 401) {
      throw new ApiClientError(response.status, "INTERNAL_ERROR", "La déconnexion n'a pas abouti.");
    }
  } finally {
    inMemorySessionAccessToken = null;
  }
}

export function getProfile(): Promise<ProfileResponse> {
  return request("/api/v1/profile", profileResponseSchema);
}

export function updateProfile(input: UpdateProfileRequest): Promise<ProfileResponse> {
  return request("/api/v1/profile", profileResponseSchema, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function listUsers() {
  return request("/api/v1/admin/users", adminUserListResponseSchema);
}

export function createInvitation(input: CreateInvitationRequest) {
  return request("/api/v1/admin/invitations", invitationResponseSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createResetCode(userId: string) {
  return request("/api/v1/admin/reset-codes", resetCodeResponseSchema, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function updateUserStatus(
  userId: string,
  status: "active" | "disabled",
): Promise<CurrentUser> {
  return request(`/api/v1/admin/users/${encodeURIComponent(userId)}/status`, currentUserSchema, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listKnowledgeCards(): Promise<KnowledgeCardListResponse> {
  return request("/api/v1/admin/knowledge-cards", knowledgeCardListResponseSchema);
}

export function createKnowledgeCard(input: CreateKnowledgeCardRequest): Promise<KnowledgeCard> {
  return request("/api/v1/admin/knowledge-cards", knowledgeCardSchema, {
    method: "POST",
    headers: { "X-BAC-Knowledge-Write": "1" },
    body: JSON.stringify(input),
  });
}

export function updateKnowledgeCard(
  cardId: string,
  input: UpdateKnowledgeCardRequest,
): Promise<KnowledgeCard> {
  return request(
    `/api/v1/admin/knowledge-cards/${encodeURIComponent(cardId)}`,
    knowledgeCardSchema,
    {
      method: "PUT",
      headers: { "X-BAC-Knowledge-Write": "1" },
      body: JSON.stringify(input),
    },
  );
}

export function getStudentCatalogue(): Promise<StudentCatalogueResponse> {
  return request("/api/v1/catalogue", studentCatalogueResponseSchema);
}

export function getAdminCatalogue(): Promise<StudentCatalogueResponse> {
  return request("/api/v1/admin/catalogue", studentCatalogueResponseSchema);
}

export function listDailyReports(): Promise<DailyReportListResponse> {
  return request("/api/v1/daily-reports", dailyReportListResponseSchema);
}

export function createDailyReport(input: CreateDailyReportRequest): Promise<DailyReport> {
  return request("/api/v1/daily-reports", dailyReportSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface DailyReportAttachmentUpload {
  id: string;
  kind: DailyReportAttachmentKind;
  originalName: string;
  content: Blob;
  durationSeconds: number | null;
}

export function uploadDailyReportAttachment(
  reportId: string,
  input: DailyReportAttachmentUpload,
): Promise<DailyReportAttachment> {
  const form = new FormData();
  form.append("id", input.id);
  form.append("kind", input.kind);
  if (input.durationSeconds !== null) {
    form.append("durationSeconds", String(input.durationSeconds));
  }
  form.append("media", input.content, input.originalName);
  return request(
    `/api/v1/daily-reports/${encodeURIComponent(reportId)}/attachments`,
    dailyReportAttachmentSchema,
    {
      method: "POST",
      headers: { "X-BAC-Media-Upload": "1" },
      body: form,
    },
  );
}

export function listDailyReportAttachments(
  reportId: string,
): Promise<DailyReportAttachmentListResponse> {
  return request(
    `/api/v1/daily-reports/${encodeURIComponent(reportId)}/attachments`,
    dailyReportAttachmentListResponseSchema,
  );
}

export function generateCourseDraft(reportId: string, force = false): Promise<CourseDraft> {
  return request(
    `/api/v1/daily-reports/${encodeURIComponent(reportId)}/enrichment`,
    courseDraftSchema,
    {
      method: "POST",
      headers: { "X-BAC-Enrichment": "1" },
      body: JSON.stringify({ force }),
    },
  );
}

export function getCourseDraft(reportId: string): Promise<CourseDraft> {
  return request(`/api/v1/daily-reports/${encodeURIComponent(reportId)}/draft`, courseDraftSchema);
}

export function reviewDraftCorrection(
  reportId: string,
  correctionId: string,
  input: ReviewDraftCorrectionRequest,
): Promise<CourseDraft> {
  return request(
    `/api/v1/daily-reports/${encodeURIComponent(reportId)}/draft/corrections/${encodeURIComponent(correctionId)}`,
    courseDraftSchema,
    {
      method: "PATCH",
      headers: { "X-BAC-Enrichment": "1" },
      body: JSON.stringify(input),
    },
  );
}

export function acceptCourseDraft(reportId: string): Promise<CourseDraft> {
  return request(
    `/api/v1/daily-reports/${encodeURIComponent(reportId)}/draft/accept`,
    courseDraftSchema,
    { method: "POST", headers: { "X-BAC-Enrichment": "1" } },
  );
}

export async function downloadPrivateMedia(path: string): Promise<Blob> {
  if (!path.startsWith("/api/v1/daily-reports/")) {
    throw new Error("Unexpected private media path.");
  }
  const headers = new Headers({ Accept: "image/*, audio/*" });
  if (inMemorySessionAccessToken) {
    headers.set("X-BAC-Preview-Session", inMemorySessionAccessToken);
  }
  const response = await fetch(path, { credentials: "same-origin", headers });
  if (!response.ok) {
    if (response.status === 401) inMemorySessionAccessToken = null;
    const body: unknown = await response.json().catch(() => null);
    const parsed = apiErrorSchema.safeParse(body);
    throw new ApiClientError(
      response.status,
      parsed.success ? parsed.data.error.code : "INTERNAL_ERROR",
      parsed.success ? parsed.data.error.message : "Le média est temporairement indisponible.",
    );
  }
  return response.blob();
}
