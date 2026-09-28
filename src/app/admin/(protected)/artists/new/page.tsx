import Link from "next/link";
import { ArtistForm } from "@/components/admin/artist-form";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "New artist",
};

export default function NewArtistPage() {
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
          Add artist
        </h1>
      </div>
      <Card>
        <CardTitle>Artist details</CardTitle>
        <CardDescription>
          Create a new artist. Slug is generated from the name and can be edited
          before saving.
        </CardDescription>
        <div className="mt-6">
          <ArtistForm mode="create" />
        </div>
      </Card>
    </div>
  );
}
