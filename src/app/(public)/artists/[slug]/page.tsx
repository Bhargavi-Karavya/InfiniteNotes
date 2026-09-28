import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MediaImage } from "@/components/public/media-image";
import { EmptyState, SectionHeader } from "@/components/public/section-header";
import { SongCard } from "@/components/public/song-card";
import { AnalyticsBeacon } from "@/components/analytics/analytics-beacon";
import { JsonLdScript, artistJsonLd } from "@/components/seo/json-ld";
import { SITE_NAME, absoluteUrl } from "@/lib/site";
import { getArtistBySlug } from "@/services/artists";
import { getArtistSongs } from "@/services/songs";

export const dynamic = "force-dynamic";

type ArtistPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ArtistPageProps): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);

  if (!artist) {
    notFound();
  }

  const title = `${artist.name} Songs & Lyrics | ${SITE_NAME}`;
  const description =
    artist.biography?.trim().slice(0, 155) ||
    `Browse ${artist.name} songs and lyrics on ${SITE_NAME}.`;
  const url = absoluteUrl(`/artists/${artist.slug}`);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "profile",
      siteName: SITE_NAME,
      ...(artist.profileImage
        ? { images: [{ url: artist.profileImage, alt: artist.name }] }
        : {}),
    },
    twitter: {
      card: artist.profileImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(artist.profileImage ? { images: [artist.profileImage] } : {}),
    },
  };
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);

  if (!artist) {
    notFound();
  }

  const songsResult = await getArtistSongs(artist.id, { pageSize: 50 });
  const initials = artist.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="page-shell pb-16 pt-5 sm:pt-8">
      <AnalyticsBeacon
        eventType="ARTIST_VIEW"
        entityId={artist.id}
        path={`/artists/${artist.slug}`}
      />
      <JsonLdScript
        data={artistJsonLd({
          name: artist.name,
          slug: artist.slug,
          biography: artist.biography,
          profileImage: artist.profileImage,
        })}
      />

      <nav
        className="mb-5 hidden text-xs text-muted-foreground sm:block"
        aria-label="Breadcrumb"
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/artists" className="hover:text-foreground">
              Artists
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-foreground">{artist.name}</li>
        </ol>
      </nav>

      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:text-left">
        <MediaImage
          src={artist.profileImage}
          alt={artist.profileImage ? artist.name : ""}
          fallbackLabel={initials || "?"}
          className="h-28 w-28 rounded-full sm:h-32 sm:w-32"
        />
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
            {artist.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {songsResult.total} published song
            {songsResult.total === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      {artist.biography?.trim() ? (
        <section className="mt-8 max-w-2xl" aria-labelledby="artist-bio-heading">
          <h2
            id="artist-bio-heading"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            Biography
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground sm:text-base">
            {artist.biography}
          </p>
        </section>
      ) : null}

      <section className="mt-10" aria-labelledby="artist-songs-heading">
        <SectionHeader
          id="artist-songs-heading"
          title="Songs"
          description={`Published lyrics by ${artist.name}`}
        />

        {songsResult.items.length === 0 ? (
          <EmptyState
            title="No published songs yet"
            description={`Published songs by ${artist.name} will appear here.`}
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
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {songsResult.items.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
