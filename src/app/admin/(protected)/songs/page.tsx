import { SongList } from "@/components/admin/song-list";
import { UnauthorizedError } from "@/services/auth";
import {
  listArtistsForSongForm,
  listSongsAdmin,
} from "@/services/songs";
import { songListQuerySchema } from "@/validations/songs";

export const metadata = {
  title: "Songs",
};

type AdminSongsPageProps = {
  searchParams: Promise<{
    q?: string;
    artistId?: string;
    published?: string;
    page?: string;
  }>;
};

export default async function AdminSongsPage({
  searchParams,
}: AdminSongsPageProps) {
  const params = await searchParams;
  const parsed = songListQuerySchema.safeParse({
    q: params.q,
    artistId: params.artistId,
    published: params.published,
    page: params.page,
  });

  if (!parsed.success) {
    return (
      <SongList
        songs={[]}
        artists={[]}
        query=""
        published="all"
        page={1}
        totalPages={1}
        total={0}
        error="Invalid search parameters."
      />
    );
  }

  let listError: string | null = null;
  let artists: Awaited<ReturnType<typeof listArtistsForSongForm>> = [];
  let result = {
    items: [] as Awaited<ReturnType<typeof listSongsAdmin>>["items"],
    page: parsed.data.page,
    totalPages: 1,
    total: 0,
  };

  try {
    [result, artists] = await Promise.all([
      listSongsAdmin(parsed.data),
      listArtistsForSongForm(),
    ]);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    listError = "Unable to load songs. Please try again.";
  }

  return (
    <SongList
      songs={result.items}
      artists={artists}
      query={parsed.data.q}
      artistId={parsed.data.artistId}
      published={parsed.data.published}
      page={result.page}
      totalPages={result.totalPages}
      total={result.total}
      error={listError}
    />
  );
}
