import { jsonError, jsonOk } from "@/lib/api";
import {
  ArtistConflictError,
  ArtistHasSongsError,
  ArtistNotFoundError,
  deleteArtist,
  getArtistById,
  updateArtist,
} from "@/services/artists";
import { UnauthorizedError } from "@/services/auth";
import { updateArtistSchema } from "@/validations/artists";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function mapError(error: unknown) {
  if (error instanceof UnauthorizedError || (error instanceof Error && error.name === "UnauthorizedError")) {
    return jsonError("Unauthorized", 401);
  }
  if (error instanceof ArtistNotFoundError) {
    return jsonError(error.message, 404);
  }
  if (error instanceof ArtistConflictError) {
    return jsonError(error.message, 409);
  }
  if (error instanceof ArtistHasSongsError) {
    return jsonError(error.message, 409);
  }
  console.error("Artist API error:", error instanceof Error ? error.message : "unknown");
  return jsonError("Unable to process artist request", 500);
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonError("Invalid artist id", 400);
  }

  try {
    const artist = await getArtistById(id);
    return jsonOk({ artist });
  } catch (error) {
    return mapError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonError("Invalid artist id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = updateArtistSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  try {
    const artist = await updateArtist(id, parsed.data);
    return jsonOk({ artist });
  } catch (error) {
    return mapError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonError("Invalid artist id", 400);
  }

  try {
    await deleteArtist(id);
    return jsonOk({ success: true });
  } catch (error) {
    return mapError(error);
  }
}
