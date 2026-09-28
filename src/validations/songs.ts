import { z } from "zod";

const optionalUrl = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return typeof value === "string" ? value.trim() : value;
}, z.string().url("Enter a valid image URL").nullable());

const optionalLyrics = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return value;
  }
  // Preserve line breaks and internal whitespace; only treat fully empty as null.
  return value.length === 0 ? null : value;
}, z.string().max(200_000, "Lyrics are too long").nullable());

const publishedFlag = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true" || value === "on" || value === "1") {
    return true;
  }
  if (value === "false" || value === "off" || value === "0" || value === "" || value == null) {
    return false;
  }
  return value;
}, z.boolean());

export const createSongSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(255, "Title must be 255 characters or fewer"),
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required")
      .max(255, "Slug must be 255 characters or fewer")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase letters, numbers, and hyphens",
      ),
    artistId: z.string().uuid("Select an artist"),
    coverImage: optionalUrl,
    lyrics: optionalLyrics,
    isPublished: publishedFlag.default(false),
  })
  .superRefine((data, ctx) => {
    if (data.isPublished) {
      const lyrics = data.lyrics?.trim() ?? "";
      if (!lyrics) {
        ctx.addIssue({
          code: "custom",
          message: "Lyrics are required before publishing a song",
          path: ["lyrics"],
        });
      }
    }
  });

export const updateSongSchema = createSongSchema;

export const songListQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(""),
  artistId: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    return value;
  }, z.string().uuid().optional()),
  published: z
    .enum(["all", "published", "unpublished"])
    .optional()
    .default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateSongInput = z.infer<typeof createSongSchema>;
export type UpdateSongInput = z.infer<typeof updateSongSchema>;
export type SongListQuery = z.infer<typeof songListQuerySchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
