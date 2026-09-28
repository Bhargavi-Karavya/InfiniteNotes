import type { Metadata } from "next";
import Link from "next/link";
import { ArtistCard } from "@/components/public/artist-card";
import { EmptyState, SectionHeader } from "@/components/public/section-header";
import { MediaImage } from "@/components/public/media-image";
import { PublicSearchForm } from "@/components/public/search-form";
import { AnalyticsBeacon } from "@/components/analytics/analytics-beacon";
import { searchCatalog } from "@/services/search";
import type { PublicArtistWithSongCount } from "@/services/artists";
import type { PublicSong } from "@/services/songs";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim();

  return {
    title: query ? `Search: ${query}` : "Search",
    description: "Search songs and artists on InfiniteNotes.",
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    },
    // Search query pages must not become indexable canonical landing pages.
    alternates: {
      canonical: null,
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const results =
    query.length > 0
      ? await searchCatalog({ q: query, limit: 20 })
      : { songs: [], artists: [] };

  const songCards: PublicSong[] = results.songs.map((song) => ({
    id: song.id,
    title: song.title,
    slug: song.slug,
    artistId: "",
    artistName: song.artistName,
    artistSlug: song.artistSlug,
    lyrics: null,
    coverImage: song.coverImage,
    albumName: null,
    releaseYear: null,
    isPublished: true,
    rightsStatus: "NOT_PROVIDED",
    sourceName: null,
    sourceUrl: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }));

  const artistCards: PublicArtistWithSongCount[] = results.artists.map(
    (artist) => ({
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      profileImage: artist.profileImage,
      biography: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      songCount: artist.songCount,
    }),
  );

  const hasResults = songCards.length > 0 || artistCards.length > 0;

  return (
    <div className="page-shell pb-14 pt-6 sm:pt-8">
      {query ? (
        <AnalyticsBeacon
          eventType="SEARCH"
          query={query}
          path="/search"
        />
      ) : null}
      <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Find songs and artists across InfiniteNotes
      </p>

      <div className="mt-5 max-w-xl">
        <PublicSearchForm
          id="search-page-input"
          defaultQuery={query}
          autoFocus
        />
      </div>

      {!query ? (
        <EmptyState
          className="mt-8"
          title="Start typing to search"
          description="Search by song title or artist name. You can also browse the full catalog."
          action={
            <div className="flex justify-center gap-4 text-sm">
              <Link href="/songs" className="font-medium text-brand-600 hover:underline">
                Songs
              </Link>
              <Link
                href="/artists"
                className="font-medium text-brand-600 hover:underline"
              >
                Artists
              </Link>
            </div>
          }
        />
      ) : null}

      {query && !hasResults ? (
        <EmptyState
          className="mt-8"
          title={`No results for “${query}”`}
          description="Try another spelling, or browse songs and artists instead."
          action={
            <div className="flex justify-center gap-4 text-sm">
              <Link href="/songs" className="font-medium text-brand-600 hover:underline">
                Browse songs
              </Link>
              <Link
                href="/artists"
                className="font-medium text-brand-600 hover:underline"
              >
                Browse artists
              </Link>
            </div>
          }
        />
      ) : null}

      {query && hasResults ? (
        <div className="mt-8 space-y-10">
          <p className="text-sm text-muted-foreground">
            Results for{" "}
            <span className="font-medium text-foreground">“{query}”</span>
          </p>

          {songCards.length > 0 ? (
            <section aria-labelledby="search-songs-heading">
              <SectionHeader
                id="search-songs-heading"
                title="Songs"
                description={`${songCards.length} match${songCards.length === 1 ? "" : "es"}`}
              />
              <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
                {songCards.map((song) => (
                  <li key={song.id}>
                    <Link
                      href={`/songs/${song.slug}`}
                      className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400"
                    >
                      <MediaImage
                        src={song.coverImage}
                        alt={song.coverImage ? `${song.title} cover` : ""}
                        fallbackLabel="♪"
                        className="h-12 w-12 rounded-lg"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {song.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {song.artistName}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {artistCards.length > 0 ? (
            <section aria-labelledby="search-artists-heading">
              <SectionHeader
                id="search-artists-heading"
                title="Artists"
                description={`${artistCards.length} match${artistCards.length === 1 ? "" : "es"}`}
              />
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {artistCards.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
