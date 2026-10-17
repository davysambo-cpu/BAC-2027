import { z } from "zod";

import { currentUserSchema, displayNameSchema } from "./auth";

export const profilePreferencesSchema = z.object({
  dailyRevisionGoalMinutes: z.number().int().min(15).max(240).default(45),
  downloadOnWifiOnly: z.boolean().default(true),
  reducedMotion: z.boolean().default(false),
});

export const updateProfileRequestSchema = z.object({
  displayName: displayNameSchema,
  preferences: profilePreferencesSchema,
});

export const profileResponseSchema = z.object({
  user: currentUserSchema,
  preferences: profilePreferencesSchema,
});

export type ProfilePreferences = z.infer<typeof profilePreferencesSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
export type ProfileResponse = z.infer<typeof profileResponseSchema>;
