import { z } from "zod";
import type { ImportedMusicRecord } from "./types";
import { MAX_IMPORT_RECORDS } from "./types";
import { hasImportPermission } from "./import-normalizer";

const rightsStatusSchema = z.enum([
  "PENDING_PERMISSION",
  "AUTHORIZED",
  "PUBLIC_DOMAIN",
  "NOT_PROVIDED",
  "REMOVED",
]);

export const importedMusicRecordSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or fewer"),
  artistName: z
    .string()
    .trim()
    .min(1, "Artist name is required")
    .max(255, "Artist name must be 255 characters or fewer"),
  artistSlug: z
    .string()
    .trim()
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  songSlug: z
    .string()
    .trim()
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  albumName: z.string().trim().max(255).optional(),
  releaseYear: z
    .number()
    .int("Release year must be a whole number")
    .min(1000, "Release year looks invalid")
    .max(2100, "Release year looks invalid")
    .optional(),
  coverImage: z
    .string()
    .trim()
    .url("Cover image must be a valid URL")
    .max(2000)
    .optional(),
  lyrics: z.string().max(200_000, "Lyrics are too long").nullable().optional(),
  sourceUrl: z.string().trim().url("Source URL must be valid").max(2000),
  sourceName: z.string().trim().min(1).max(255),
  externalId: z.string().trim().max(255).optional(),
  rightsStatus: rightsStatusSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type ValidatedImportedRecord = z.infer<typeof importedMusicRecordSchema>;

export function validateImportedRecord(
  record: ImportedMusicRecord,
  options?: { requireRights?: boolean },
): { ok: true; data: ValidatedImportedRecord } | { ok: false; errors: string[] } {
  const parsed = importedMusicRecordSchema.safeParse(record);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }

  const requireRights = options?.requireRights !== false;
  if (requireRights && !hasImportPermission(parsed.data.rightsStatus)) {
    return {
      ok: false,
      errors: [
        "No rights/permission to import this song. Only AUTHORIZED or PUBLIC_DOMAIN records can be imported.",
      ],
    };
  }

  return { ok: true, data: parsed.data };
}

export function assertRecordLimit(count: number): void {
  if (count > MAX_IMPORT_RECORDS) {
    throw new Error(
      `Imports are limited to ${MAX_IMPORT_RECORDS} records at a time.`,
    );
  }
}

export const previewImportInputSchema = z.object({
  providerId: z.string().trim().min(1).max(64),
  sourceUrl: z.string().trim().url("Enter a valid source URL").max(2000),
  /** Default true: only AUTHORIZED / PUBLIC_DOMAIN may be imported. */
  requireRights: z.boolean().optional().default(true),
});

export const commitImportInputSchema = z.object({
  jobId: z.string().uuid(),
  selections: z
    .array(
      z.object({
        key: z.string().min(1).max(128),
        selected: z.boolean(),
        artistAction: z.enum(["create", "skip", "map"]),
        mapArtistId: z.string().uuid().optional(),
        songAction: z.enum(["create", "skip", "update_metadata"]),
      }),
    )
    .max(MAX_IMPORT_RECORDS),
});
