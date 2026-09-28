import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtistForm } from "@/components/admin/artist-form";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ArtistNotFoundError, getArtistById } from "@/services/artists";

export const metadata = {
  title: "Edit artist",
};

type EditArtistPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function EditArtistPage({
  params,
  searchParams,
}: EditArtistPageProps) {
  const { id } = await params;
  const { created } = await searchParams;

  if (!isUuid(id)) {
    notFound();
  }

  let artist;
  try {
    artist = await getArtistById(id);
  } catch (error) {
    if (error instanceof ArtistNotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <Link
          href="/admin/artists"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to artists
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          Edit artist
        </h1>
      </div>
      <Card>
        <CardTitle>{artist.name}</CardTitle>
        <CardDescription>Update artist details and save changes.</CardDescription>
        <div className="mt-6">
          <ArtistForm
            mode="edit"
            artist={artist}
            created={created === "1"}
          />
        </div>
      </Card>
    </div>
  );
}
