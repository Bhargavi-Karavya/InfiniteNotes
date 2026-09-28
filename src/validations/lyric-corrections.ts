import { z } from "zod";

/** Max lyrics length for a correction (chars). */
export const MAX_SUGGESTED_LYRICS = 50_000;
export const MIN_SUGGESTED_LYRICS = 1;
export const MAX_CORRECTION_REASON = 500;
export const MAX_ADMIN_NOTE = 1000;

export const submitLyricCorrectionSchema = z
  .object({
    songId: z.string().uuid(),
    suggestedLyrics: z
      .string()
      .min(MIN_SUGGESTED_LYRICS, "Suggested correction is required.")
      .max(
        MAX_SUGGESTED_LYRICS,
        `Suggested correction must be at most ${MAX_SUGGESTED_LYRICS} characters.`,
      )
      .refine((v) => v.trim().length > 0, "Suggested correction is required."),
    reason: z.string().max(MAX_CORRECTION_REASON).optional(),
  })
  .transform((data) => ({
    songId: data.songId,
    suggestedLyrics: data.suggestedLyrics,
    reason: data.reason?.trim() ? data.reason.trim() : undefined,
  }));

export type SubmitLyricCorrectionInput = z.output<
  typeof submitLyricCorrectionSchema
>;

export const correctionStatusFilterSchema = z
  .enum(["all", "PENDING", "APPROVED", "REJECTED"])
  .default("PENDING");

export const correctionListQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(""),
  status: correctionStatusFilterSchema,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type CorrectionListQuery = z.infer<typeof correctionListQuerySchema>;

export const rejectCorrectionSchema = z.object({
  adminNote: z
    .string()
    .max(MAX_ADMIN_NOTE)
    .optional()
    .transform((v) => {
      const trimmed = v?.trim() ?? "";
      return trimmed.length > 0 ? trimmed : undefined;
    }),
});
