import { jsonError, jsonOk } from "@/lib/api";
import { searchQuerySchema } from "@/validations/songs";
import { searchCatalog } from "@/services/search";

/**
 * Search API foundation.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = searchQuerySchema.safeParse({
    q: searchParams.get("q") ?? "",
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError("Invalid search query", 400, parsed.error.flatten());
  }

  const results = await searchCatalog(parsed.data);
  return jsonOk(results);
}
