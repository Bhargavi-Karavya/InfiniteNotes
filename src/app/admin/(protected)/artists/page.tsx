import { ArtistList } from "@/components/admin/artist-list";
import { listArtists } from "@/services/artists";
import { UnauthorizedError } from "@/services/auth";
import { artistListQuerySchema } from "@/validations/artists";

export const metadata = {
  title: "Artists",
};

type AdminArtistsPageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function AdminArtistsPage({
  searchParams,
}: AdminArtistsPageProps) {
  const params = await searchParams;
  const parsed = artistListQuerySchema.safeParse({
    q: params.q,
    page: params.page,
  });

  if (!parsed.success) {
    return (
      <ArtistList
        artists={[]}
        query=""
        page={1}
        totalPages={1}
        total={0}
        error="Invalid search parameters."
      />
    );
  }

  let listError: string | null = null;
  let result = {
    items: [] as Awaited<ReturnType<typeof listArtists>>["items"],
    page: parsed.data.page,
    totalPages: 1,
    total: 0,
  };

  try {
    result = await listArtists(parsed.data);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    listError = "Unable to load artists. Please try again.";
  }

  return (
    <ArtistList
      artists={result.items}
      query={parsed.data.q}
      page={result.page}
      totalPages={result.totalPages}
      total={result.total}
      error={listError}
    />
  );
}
