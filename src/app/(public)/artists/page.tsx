import type { Metadata } from "next";
import Link from "next/link";
import { ArtistCard } from "@/components/public/artist-card";
import { EmptyState } from "@/components/public/section-header";
import { absoluteUrl } from "@/lib/site";
import { getFeaturedArtists } from "@/services/artists";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Artists",
  description: "Browse artists with published songs on InfiniteNotes.",
  alternates: {
    canonical: absoluteUrl("/artists"),
  },
  openGraph: {
    title: "Artists | InfiniteNotes",
    description: "Browse artists with published songs on InfiniteNotes.",
    url: absoluteUrl("/artists"),
    siteName: "InfiniteNotes",
    type: "website",
  },
};

export default async function ArtistsIndexPage() {
  const artists = await getFeaturedArtists(48);

  return (
    <div className="page-shell pb-14 pt-6 sm:pt-8">
      <h1 className="text-2xl font-semibold tracking-tight">Artists</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Artists with published songs
      </p>

      {artists.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No artists to show yet"
          description="Artists appear here once they have published songs."
          action={
            <Link
              href="/"
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Back to home
            </Link>
          }
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      )}
    </div>
  );
}
