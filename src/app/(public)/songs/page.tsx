import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/public/section-header";
import { SongCard } from "@/components/public/song-card";
import { absoluteUrl } from "@/lib/site";
import { getPublishedSongs } from "@/services/songs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Songs",
  description: "Browse published songs and lyrics on InfiniteNotes.",
  alternates: {
    canonical: absoluteUrl("/songs"),
  },
  openGraph: {
    title: "Songs | InfiniteNotes",
    description: "Browse published songs and lyrics on InfiniteNotes.",
    url: absoluteUrl("/songs"),
    siteName: "InfiniteNotes",
    type: "website",
  },
};

export default async function SongsIndexPage() {
  const result = await getPublishedSongs({ pageSize: 48 });

  return (
    <div className="page-shell pb-14 pt-6 sm:pt-8">
      <h1 className="text-2xl font-semibold tracking-tight">Songs</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        All published lyrics on InfiniteNotes
      </p>

      {result.items.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No published songs yet"
          description="New songs will show up here when they are published."
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
        <div className="mt-6 grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {result.items.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      )}
    </div>
  );
}
