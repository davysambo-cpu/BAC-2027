import { z } from "zod";

import { currentUserSchema, displayNameSchema, userStatusSchema, usernameSchema } from "./auth";
import { isoDateTimeSchema, uuidSchema } from "./common";

export const createInvitationRequestSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
});

export const invitationResponseSchema = z.object({
  id: uuidSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
  activationPath: z.string().startsWith("/activation?token="),
  expiresAt: isoDateTimeSchema,
});

export const createResetCodeRequestSchema = z.object({
  userId: uuidSchema,
});

export const resetCodeResponseSchema = z.object({
  username: usernameSchema,
  code: z.string().regex(/^\d{8}$/),
  expiresAt: isoDateTimeSchema,
});

export const updateUserStatusRequestSchema = z.object({
  status: userStatusSchema.extract(["active", "disabled"]),
});

export const adminUserListResponseSchema = z.object({
  users: z.array(currentUserSchema),
});

export type CreateInvitationRequest = z.infer<typeof createInvitationRequestSchema>;
export type InvitationResponse = z.infer<typeof invitationResponseSchema>;
export type ResetCodeResponse = z.infer<typeof resetCodeResponseSchema>;
