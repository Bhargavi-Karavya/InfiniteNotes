import Link from "next/link";
import { notFound } from "next/navigation";
import { SongForm } from "@/components/admin/song-form";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  SongNotFoundError,
  getSongById,
  listArtistsForSongForm,
} from "@/services/songs";

export const metadata = {
  title: "Edit song",
};

type EditSongPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function EditSongPage({
  params,
  searchParams,
}: EditSongPageProps) {
  const { id } = await params;
  const { created } = await searchParams;

  if (!isUuid(id)) {
    notFound();
  }

  let song;
  try {
    song = await getSongById(id);
  } catch (error) {
    if (error instanceof SongNotFoundError) {
      notFound();
    }
    throw error;
  }

  const artists = await listArtistsForSongForm();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <Link
          href="/admin/songs"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to songs
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Edit song</h1>
      </div>
      <Card>
        <CardTitle>{song.title}</CardTitle>
        <CardDescription>
          Update lyrics, artist, and publish status.
        </CardDescription>
        <div className="mt-6">
          <SongForm
            mode="edit"
            song={song}
            artists={artists}
            created={created === "1"}
          />
        </div>
      </Card>
    </div>
  );
}
