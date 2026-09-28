"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  SongArtistNotFoundError,
  SongConflictError,
  SongNotFoundError,
  SongPublishError,
  createSong,
  deleteSong,
  deleteSongs,
  setSongPublished,
  setSongsPublished,
  updateSong,
} from "@/services/songs";
import { UnauthorizedError } from "@/services/auth";
import { createSongSchema, updateSongSchema } from "@/validations/songs";

export type SongActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export type BulkPublishActionResult =
  | {
      ok: true;
      updated: number;
      skipped: number;
      failed: Array<{ id: string; title: string; error: string }>;
    }
  | { ok: false; error: string };

export type BulkDeleteActionResult =
  | {
      ok: true;
      deleted: number;
      failed: Array<{ id: string; title: string; error: string }>;
    }
  | { ok: false; error: string };

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isNextRedirect(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  if (!("digest" in error)) {
    return false;
  }
  return (
    typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")
  );
}

function mapSongError(error: unknown): SongActionResult {
  if (
    error instanceof UnauthorizedError ||
    (error instanceof Error && error.name === "UnauthorizedError")
  ) {
    return { ok: false, error: "You must be signed in as an admin." };
  }
  if (error instanceof SongConflictError) {
    return {
      ok: false,
      error: error.message,
      fieldErrors: { slug: [error.message] },
    };
  }
  if (error instanceof SongArtistNotFoundError) {
    return {
      ok: false,
      error: error.message,
      fieldErrors: { artistId: [error.message] },
    };
  }
  if (error instanceof SongNotFoundError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof SongPublishError) {
    return { ok: false, error: error.message };
  }

  console.error(
    "Song action failed:",
    error instanceof Error ? error.message : "unknown",
  );
  return { ok: false, error: "Something went wrong. Please try again." };
}

function parseSongForm(formData: FormData) {
  return {
    title: formString(formData, "title"),
    slug: formString(formData, "slug"),
    artistId: formString(formData, "artistId"),
    coverImage: formString(formData, "coverImage"),
    // Do not trim lyrics — preserve pasted formatting and blank lines.
    lyrics: formString(formData, "lyrics"),
    isPublished: formString(formData, "isPublished"),
  };
}

export async function createSongAction(
  _prev: SongActionResult | null,
  formData: FormData,
): Promise<SongActionResult> {
  const parsed = createSongSchema.safeParse(parseSongForm(formData));

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const song = await createSong(parsed.data);
    revalidatePath("/admin/songs");
    redirect(`/admin/songs/${song.id}/edit?created=1`);
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    return mapSongError(error);
  }
}

export async function updateSongAction(
  id: string,
  _prev: SongActionResult | null,
  formData: FormData,
): Promise<SongActionResult> {
  if (!id) {
    return { ok: false, error: "Invalid song id." };
  }

  const parsed = updateSongSchema.safeParse(parseSongForm(formData));

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateSong(id, parsed.data);
    revalidatePath("/admin/songs");
    revalidatePath(`/admin/songs/${id}/edit`);
    return { ok: true };
  } catch (error) {
    return mapSongError(error);
  }
}

export async function deleteSongAction(id: string): Promise<SongActionResult> {
  if (!id) {
    return { ok: false, error: "Invalid song id." };
  }

  try {
    await deleteSong(id);
    revalidatePath("/admin/songs");
    return { ok: true };
  } catch (error) {
    return mapSongError(error);
  }
}

function revalidateSongSurfaces() {
  revalidatePath("/admin/songs");
  revalidatePath("/songs");
  revalidatePath("/lyrics");
  revalidatePath("/");
  revalidatePath("/search");
}

export async function setSongPublishedAction(
  id: string,
  isPublished: boolean,
): Promise<SongActionResult> {
  if (!id) {
    return { ok: false, error: "Invalid song id." };
  }

  try {
    const song = await setSongPublished(id, isPublished);
    revalidateSongSurfaces();
    revalidatePath(`/songs/${song.slug}`);
    return { ok: true };
  } catch (error) {
    return mapSongError(error);
  }
}

export async function bulkSetSongsPublishedAction(
  ids: string[],
  isPublished: boolean,
): Promise<BulkPublishActionResult> {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "Select at least one song." };
  }
  if (ids.length > 100) {
    return { ok: false, error: "You can update at most 100 songs at once." };
  }

  try {
    const result = await setSongsPublished(ids, isPublished);
    revalidateSongSurfaces();
    return {
      ok: true,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
    };
  } catch (error) {
    if (
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.name === "UnauthorizedError")
    ) {
      return { ok: false, error: "You must be signed in as an admin." };
    }
    console.error(
      "Bulk publish failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function bulkDeleteSongsAction(
  ids: string[],
): Promise<BulkDeleteActionResult> {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "Select at least one song." };
  }
  if (ids.length > 100) {
    return { ok: false, error: "You can delete at most 100 songs at once." };
  }

  try {
    const result = await deleteSongs(ids);
    revalidateSongSurfaces();
    return {
      ok: true,
      deleted: result.deleted,
      failed: result.failed,
    };
  } catch (error) {
    if (
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.name === "UnauthorizedError")
    ) {
      return { ok: false, error: "You must be signed in as an admin." };
    }
    console.error(
      "Bulk delete failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
