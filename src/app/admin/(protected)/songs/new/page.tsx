import Link from "next/link";
import { SongForm } from "@/components/admin/song-form";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listArtistsForSongForm } from "@/services/songs";

export const metadata = {
  title: "New song",
};

export default async function NewSongPage() {
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
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Add song</h1>
      </div>
      <Card>
        <CardTitle>Song details</CardTitle>
        <CardDescription>
          Create a song with lyrics. Publish only when content is ready for the
          public catalog.
        </CardDescription>
        <div className="mt-6">
          {artists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You need at least one artist before creating a song.{" "}
              <Link href="/admin/artists/new" className="text-brand-600 underline">
                Create an artist
              </Link>
              .
            </p>
          ) : (
            <SongForm mode="create" artists={artists} />
          )}
        </div>
      </Card>
    </div>
  );
}
