import { jsonError, jsonOk } from "@/lib/api";
import {
  ArtistConflictError,
  createArtist,
  listArtists,
} from "@/services/artists";
import { UnauthorizedError } from "@/services/auth";
import {
  artistListQuerySchema,
  createArtistSchema,
} from "@/validations/artists";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = artistListQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError("Invalid query", 400, parsed.error.flatten());
  }

  try {
    const result = await listArtists(parsed.data);
    return jsonOk(result);
  } catch (error) {
    if (error instanceof UnauthorizedError || (error instanceof Error && error.name === "UnauthorizedError")) {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Unable to list artists", 500);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createArtistSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  try {
    const artist = await createArtist(parsed.data);
    return jsonOk({ artist }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError || (error instanceof Error && error.name === "UnauthorizedError")) {
      return jsonError("Unauthorized", 401);
    }
    if (error instanceof ArtistConflictError) {
      return jsonError(error.message, 409);
    }
    console.error("Create artist failed:", error instanceof Error ? error.message : "unknown");
    return jsonError("Unable to create artist", 500);
  }
}
