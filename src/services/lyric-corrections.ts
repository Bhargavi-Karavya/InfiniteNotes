import { revalidatePath } from "next/cache";
import { assertAdmin, UnauthorizedError } from "@/services/auth";
import { findPublishedSongBySlug, findSongById } from "@/repositories/songs";
import {
  approveCorrectionInTransaction,
  findCorrectionById,
  findCorrectionRequests,
  insertCorrectionRequest,
  rejectCorrectionInTransaction,
  type CorrectionWithSong,
} from "@/repositories/lyric-corrections";
import type {
  CorrectionListQuery,
  SubmitLyricCorrectionInput,
} from "@/validations/lyric-corrections";

export class CorrectionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorrectionValidationError";
  }
}

export class CorrectionNotFoundError extends Error {
  constructor(message = "Correction request not found") {
    super(message);
    this.name = "CorrectionNotFoundError";
  }
}

export class CorrectionAlreadyReviewedError extends Error {
  constructor(message = "This request has already been reviewed.") {
    super(message);
    this.name = "CorrectionAlreadyReviewedError";
  }
}

export type { CorrectionWithSong };

/**
 * Public submission — song must be published. Always creates PENDING.
 * Never accepts client-provided status/review fields.
 */
export async function submitLyricCorrection(
  input: SubmitLyricCorrectionInput,
): Promise<{ id: string }> {
  const song = await findSongById(input.songId);
  if (!song || !song.isPublished) {
    throw new CorrectionValidationError(
      "This song is not available for corrections.",
    );
  }

  // Reject no-op identical submissions
  if (
    (song.lyrics ?? "").replace(/\r\n/g, "\n") ===
    input.suggestedLyrics.replace(/\r\n/g, "\n")
  ) {
    throw new CorrectionValidationError(
      "Suggested correction matches the current lyrics.",
    );
  }

  const row = await insertCorrectionRequest({
    songId: song.id,
    suggestedLyrics: input.suggestedLyrics,
    reason: input.reason,
    status: "PENDING",
  });

  return { id: row.id };
}

export async function listCorrectionsAdmin(query: CorrectionListQuery) {
  await assertAdmin();
  const { items, total } = await findCorrectionRequests(query);
  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getCorrectionAdmin(
  id: string,
): Promise<CorrectionWithSong> {
  await assertAdmin();
  const row = await findCorrectionById(id);
  if (!row) {
    throw new CorrectionNotFoundError();
  }
  return row;
}

export async function approveCorrection(id: string): Promise<void> {
  const admin = await assertAdmin();

  let result: { songSlug: string; artistSlug: string } | null;
  try {
    result = await approveCorrectionInTransaction({
      requestId: id,
      adminId: admin.id,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CORRECTION_ALREADY_REVIEWED"
    ) {
      throw new CorrectionAlreadyReviewedError();
    }
    throw error;
  }

  if (!result) {
    const existing = await findCorrectionById(id);
    if (!existing) {
      throw new CorrectionNotFoundError();
    }
    throw new CorrectionAlreadyReviewedError();
  }

  revalidatePath(`/songs/${result.songSlug}`);
  revalidatePath(`/artists/${result.artistSlug}`);
  revalidatePath("/songs");
  revalidatePath("/");
  revalidatePath("/admin/corrections");
  revalidatePath(`/admin/corrections/${id}`);
  revalidatePath("/sitemap.xml");
}

export async function rejectCorrection(
  id: string,
  adminNote?: string,
): Promise<void> {
  const admin = await assertAdmin();

  const ok = await rejectCorrectionInTransaction({
    requestId: id,
    adminId: admin.id,
    adminNote,
  });

  if (!ok) {
    const existing = await findCorrectionById(id);
    if (!existing) {
      throw new CorrectionNotFoundError();
    }
    throw new CorrectionAlreadyReviewedError();
  }

  revalidatePath("/admin/corrections");
  revalidatePath(`/admin/corrections/${id}`);
}

/** Helper for public form: resolve published song by slug. */
export async function getPublishedSongIdBySlug(
  slug: string,
): Promise<string | null> {
  const song = await findPublishedSongBySlug(slug);
  return song?.id ?? null;
}

export { UnauthorizedError };
