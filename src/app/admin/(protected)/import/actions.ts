"use server";

import { UnauthorizedError } from "@/services/auth";
import {
  ImportServiceError,
  commitImport,
  previewImport,
} from "@/services/import/import.service";
import type {
  ImportCommitResult,
  ImportPreviewResult,
  ImportSelection,
} from "@/services/import/types";

export type ImportActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function mapError(error: unknown): string {
  if (
    error instanceof UnauthorizedError ||
    (error instanceof Error && error.name === "UnauthorizedError")
  ) {
    return "You must be signed in as an admin.";
  }
  if (error instanceof ImportServiceError) {
    return error.message;
  }
  console.error(
    "Import action failed:",
    error instanceof Error ? error.message : "unknown",
  );
  return "Something went wrong. Please try again.";
}

export async function previewImportAction(input: {
  providerId: string;
  sourceUrl: string;
  requireRights?: boolean;
}): Promise<ImportActionResult<ImportPreviewResult>> {
  try {
    const data = await previewImport(input);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function commitImportAction(input: {
  jobId: string;
  selections: ImportSelection[];
}): Promise<ImportActionResult<ImportCommitResult>> {
  try {
    const data = await commitImport(input);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}
