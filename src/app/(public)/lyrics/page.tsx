import type { Metadata } from "next";
import Link from "next/link";
import { AnalyticsBeacon } from "@/components/analytics/analytics-beacon";
import { EmptyState } from "@/components/public/section-header";
import { SongCard } from "@/components/public/song-card";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { getPublishedSongs } from "@/services/songs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lyrics",
  description:
    "Explore songs and artists, discover lyrics, and read them in a clean, focused InfiniteNotes experience.",
  alternates: {
    canonical: absoluteUrl("/lyrics"),
  },
  openGraph: {
    title: `Lyrics | ${SITE_NAME}`,
    description:
      "Explore songs and artists, discover lyrics, and read them in a clean, focused InfiniteNotes experience.",
    url: absoluteUrl("/lyrics"),
    siteName: SITE_NAME,
    type: "website",
  },
};

export default async function LyricsIndexPage() {
  const result = await getPublishedSongs({ pageSize: 48 }).catch(() => ({
    items: [] as Awaited<ReturnType<typeof getPublishedSongs>>["items"],
  }));

  return (
    <div className="page-shell pb-14 pt-6 sm:pt-8">
      <AnalyticsBeacon eventType="PAGE_VIEW" path="/lyrics" />
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight sm:text-3xl">
        Lyrics
      </h1>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground sm:text-base">
        Find songs, explore artists, and read lyrics in a clean, focused
        experience.
      </p>

      {result.items.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No published songs yet"
          description="When songs are published on InfiniteNotes, you’ll find their lyrics here."
          action={
            <Link
              href="/search"
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Search InfiniteNotes
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
