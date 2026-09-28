import { jsonError, jsonOk } from "@/lib/api";
import {
  SongArtistNotFoundError,
  SongConflictError,
  SongNotFoundError,
  deleteSong,
  getSongById,
  updateSong,
} from "@/services/songs";
import { UnauthorizedError } from "@/services/auth";
import { updateSongSchema } from "@/validations/songs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function mapError(error: unknown) {
  if (
    error instanceof UnauthorizedError ||
    (error instanceof Error && error.name === "UnauthorizedError")
  ) {
    return jsonError("Unauthorized", 401);
  }
  if (error instanceof SongNotFoundError) {
    return jsonError(error.message, 404);
  }
  if (error instanceof SongConflictError) {
    return jsonError(error.message, 409);
  }
  if (error instanceof SongArtistNotFoundError) {
    return jsonError(error.message, 400);
  }
  console.error(
    "Song API error:",
    error instanceof Error ? error.message : "unknown",
  );
  return jsonError("Unable to process song request", 500);
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonError("Invalid song id", 400);
  }

  try {
    const song = await getSongById(id);
    return jsonOk({ song });
  } catch (error) {
    return mapError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonError("Invalid song id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = updateSongSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  try {
    const song = await updateSong(id, parsed.data);
    return jsonOk({ song });
  } catch (error) {
    return mapError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonError("Invalid song id", 400);
  }

  try {
    await deleteSong(id);
    return jsonOk({ success: true });
  } catch (error) {
    return mapError(error);
  }
}
