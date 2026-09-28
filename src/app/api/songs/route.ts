import { jsonError, jsonOk } from "@/lib/api";
import {
  SongArtistNotFoundError,
  SongConflictError,
  createSong,
  listSongsAdmin,
} from "@/services/songs";
import { UnauthorizedError } from "@/services/auth";
import {
  createSongSchema,
  songListQuerySchema,
} from "@/validations/songs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = songListQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    artistId: searchParams.get("artistId") ?? undefined,
    published: searchParams.get("published") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError("Invalid query", 400, parsed.error.flatten());
  }

  try {
    const result = await listSongsAdmin(parsed.data);
    return jsonOk(result);
  } catch (error) {
    if (
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.name === "UnauthorizedError")
    ) {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Unable to list songs", 500);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createSongSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  try {
    const song = await createSong(parsed.data);
    return jsonOk({ song }, { status: 201 });
  } catch (error) {
    if (
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.name === "UnauthorizedError")
    ) {
      return jsonError("Unauthorized", 401);
    }
    if (error instanceof SongConflictError) {
      return jsonError(error.message, 409);
    }
    if (error instanceof SongArtistNotFoundError) {
      return jsonError(error.message, 400);
    }
    console.error(
      "Create song failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return jsonError("Unable to create song", 500);
  }
}
