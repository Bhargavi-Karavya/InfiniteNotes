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

const optionalBiography = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return typeof value === "string" ? value.trim() : value;
}, z.string().max(10000, "Biography is too long").nullable());

export const createArtistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or fewer"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(255, "Slug must be 255 characters or fewer")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens",
    ),
  profileImage: optionalUrl,
  biography: optionalBiography,
});

export const updateArtistSchema = createArtistSchema;

export const artistListQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateArtistInput = z.infer<typeof createArtistSchema>;
export type UpdateArtistInput = z.infer<typeof updateArtistSchema>;
export type ArtistListQuery = z.infer<typeof artistListQuerySchema>;
