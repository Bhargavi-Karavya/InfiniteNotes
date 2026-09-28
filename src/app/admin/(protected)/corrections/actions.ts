"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CorrectionAlreadyReviewedError,
  CorrectionNotFoundError,
  approveCorrection,
  rejectCorrection,
} from "@/services/lyric-corrections";
import { UnauthorizedError } from "@/services/auth";
import { rejectCorrectionSchema } from "@/validations/lyric-corrections";

export type CorrectionActionResult =
  | { ok: true }
  | { ok: false; error: string };

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function mapError(error: unknown): CorrectionActionResult {
  if (
    error instanceof UnauthorizedError ||
    (error instanceof Error && error.name === "UnauthorizedError")
  ) {
    return { ok: false, error: "You must be signed in as an admin." };
  }
  if (error instanceof CorrectionAlreadyReviewedError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof CorrectionNotFoundError) {
    return { ok: false, error: error.message };
  }
  console.error("Correction action failed:", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function approveCorrectionAction(
  id: string,
): Promise<CorrectionActionResult> {
  try {
    await approveCorrection(id);
    revalidatePath("/admin/corrections");
    revalidatePath(`/admin/corrections/${id}`);
    redirect(`/admin/corrections/${id}?reviewed=approved`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return mapError(error);
  }
}

export async function rejectCorrectionAction(
  id: string,
  _prev: CorrectionActionResult | null,
  formData: FormData,
): Promise<CorrectionActionResult> {
  const parsed = rejectCorrectionSchema.safeParse({
    adminNote: formString(formData, "adminNote"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid rejection note.",
    };
  }

  try {
    await rejectCorrection(id, parsed.data.adminNote);
    revalidatePath("/admin/corrections");
    revalidatePath(`/admin/corrections/${id}`);
    redirect(`/admin/corrections/${id}?reviewed=rejected`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return mapError(error);
  }
}
