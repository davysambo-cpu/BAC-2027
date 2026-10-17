import { z } from "zod";

import { isoDateTimeSchema, uuidSchema } from "./common";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères.")
  .max(32, "Le nom d'utilisateur ne peut pas dépasser 32 caractères.")
  .regex(
    /^[a-z0-9][a-z0-9._-]*$/,
    "Utilisez uniquement des lettres sans accent, chiffres, points, tirets ou tirets bas.",
  );

export const passwordSchema = z
  .string()
  .min(10, "Le mot de passe doit contenir au moins 10 caractères.")
  .max(128, "Le mot de passe ne peut pas dépasser 128 caractères.")
  .refine((value) => /\p{L}/u.test(value), "Ajoutez au moins une lettre.")
  .refine((value) => /\p{N}/u.test(value), "Ajoutez au moins un chiffre.");

export const displayNameSchema = z.string().trim().min(2).max(120);
export const deviceTypeSchema = z.enum(["personal", "shared"]);
export const userRoleSchema = z.enum(["student", "admin"]);
export const userStatusSchema = z.enum(["invited", "active", "disabled"]);

export const currentUserSchema = z.object({
  id: uuidSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
  role: userRoleSchema,
  status: userStatusSchema,
  seriesCode: z.string().min(1).max(20).nullable(),
});

export const loginRequestSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(128),
  deviceType: deviceTypeSchema,
});

export const activateInvitationRequestSchema = z.object({
  token: z.string().min(32).max(256),
  password: passwordSchema,
  deviceType: deviceTypeSchema,
});

export const completePasswordResetRequestSchema = z.object({
  username: usernameSchema,
  code: z.string().regex(/^\d{8}$/, "Le code doit contenir 8 chiffres."),
  password: passwordSchema,
  deviceType: deviceTypeSchema,
});

export const authResponseSchema = z.object({
  user: currentUserSchema,
  session: z.object({
    deviceType: deviceTypeSchema,
    expiresAt: isoDateTimeSchema,
  }),
  sessionAccessToken: z.string().min(32).max(256).optional(),
});

export const currentSessionResponseSchema = z.object({
  user: currentUserSchema,
  session: z.object({
    deviceType: deviceTypeSchema,
    expiresAt: isoDateTimeSchema,
  }),
});

export type DeviceType = z.infer<typeof deviceTypeSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type CurrentUser = z.infer<typeof currentUserSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type ActivateInvitationRequest = z.infer<typeof activateInvitationRequestSchema>;
export type CompletePasswordResetRequest = z.infer<typeof completePasswordResetRequestSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
