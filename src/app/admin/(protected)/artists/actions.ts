"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ArtistConflictError,
  ArtistHasSongsError,
  ArtistNotFoundError,
  createArtist,
  deleteArtist,
  updateArtist,
} from "@/services/artists";
import { UnauthorizedError } from "@/services/auth";
import {
  createArtistSchema,
  updateArtistSchema,
} from "@/validations/artists";

export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function mapArtistError(error: unknown): ActionResult {
  if (error instanceof UnauthorizedError || (error instanceof Error && error.name === "UnauthorizedError")) {
    return { ok: false, error: "You must be signed in as an admin." };
  }
  if (error instanceof ArtistConflictError) {
    return { ok: false, error: error.message, fieldErrors: { slug: [error.message] } };
  }
  if (error instanceof ArtistNotFoundError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof ArtistHasSongsError) {
    return { ok: false, error: error.message };
  }

  console.error("Artist action failed:", error instanceof Error ? error.message : "unknown");
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function createArtistAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createArtistSchema.safeParse({
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    profileImage: formString(formData, "profileImage"),
    biography: formString(formData, "biography"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const artist = await createArtist(parsed.data);
    revalidatePath("/admin/artists");
    redirect(`/admin/artists/${artist.id}/edit?created=1`);
  } catch (error) {
    // Next.js redirect throws a special error — rethrow it.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return mapArtistError(error);
  }
}

export async function updateArtistAction(
  id: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!id) {
    return { ok: false, error: "Invalid artist id." };
  }

  const parsed = updateArtistSchema.safeParse({
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    profileImage: formString(formData, "profileImage"),
    biography: formString(formData, "biography"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateArtist(id, parsed.data);
    revalidatePath("/admin/artists");
    revalidatePath(`/admin/artists/${id}/edit`);
    return { ok: true };
  } catch (error) {
    return mapArtistError(error);
  }
}

export async function deleteArtistAction(id: string): Promise<ActionResult> {
  if (!id) {
    return { ok: false, error: "Invalid artist id." };
  }

  try {
    await deleteArtist(id);
    revalidatePath("/admin/artists");
    return { ok: true };
  } catch (error) {
    return mapArtistError(error);
  }
}
