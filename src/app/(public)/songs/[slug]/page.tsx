import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LyricsBlock } from "@/components/public/lyrics-block";
import { MediaImage } from "@/components/public/media-image";
import { ShareButton } from "@/components/public/share-button";
import { SuggestCorrectionForm } from "@/components/public/suggest-correction-form";
import { BackToTopButton } from "@/components/public/back-to-top";
import { AnalyticsBeacon } from "@/components/analytics/analytics-beacon";
import { JsonLdScript, songJsonLd } from "@/components/seo/json-ld";
import { SITE_NAME, absoluteUrl } from "@/lib/site";
import { getPublishedSongBySlug } from "@/services/songs";

export const dynamic = "force-dynamic";

type SongPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: SongPageProps): Promise<Metadata> {
  const { slug } = await params;
  const song = await getPublishedSongBySlug(slug);

  if (!song) {
    notFound();
  }

  const title = `${song.title} Lyrics - ${song.artistName} | ${SITE_NAME}`;
  const description = `Read ${song.title} lyrics by ${song.artistName} on ${SITE_NAME}.`;
  const url = absoluteUrl(`/songs/${song.slug}`);

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
      type: "website",
      siteName: SITE_NAME,
      ...(song.coverImage
        ? { images: [{ url: song.coverImage, alt: `${song.title} cover` }] }
        : {}),
    },
    twitter: {
      card: song.coverImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(song.coverImage ? { images: [song.coverImage] } : {}),
    },
  };
}

export default async function SongPage({ params }: SongPageProps) {
  const { slug } = await params;
  const song = await getPublishedSongBySlug(slug);

  if (!song) {
    notFound();
  }

  const shareUrl = absoluteUrl(`/songs/${song.slug}`);

  return (
    <article className="page-shell pb-16 pt-5 sm:pt-8">
      <AnalyticsBeacon
        eventType="SONG_VIEW"
        entityId={song.id}
        path={`/songs/${song.slug}`}
      />
      <JsonLdScript
        data={songJsonLd({
          title: song.title,
          slug: song.slug,
          coverImage: song.coverImage,
          artistName: song.artistName,
          artistSlug: song.artistSlug,
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
            <Link
              href={`/artists/${song.artistSlug}`}
              className="hover:text-foreground"
            >
              {song.artistName}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="truncate text-foreground">{song.title}</li>
        </ol>
      </nav>

      <header className="flex gap-4 sm:gap-5">
        <MediaImage
          src={song.coverImage}
          alt={song.coverImage ? `${song.title} cover` : ""}
          fallbackLabel="♪"
          className="h-24 w-24 shrink-0 rounded-2xl sm:h-28 sm:w-28"
        />
        <div className="min-w-0 flex-1 self-center">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {song.title}
          </h1>
          <p className="mt-2 text-sm sm:text-base">
            <Link
              href={`/artists/${song.artistSlug}`}
              className="font-medium text-brand-600 hover:underline"
            >
              {song.artistName}
            </Link>
          </p>
          {song.albumName || song.releaseYear ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {[song.albumName, song.releaseYear].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {song.sourceName ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Metadata source:{" "}
              {song.sourceUrl ? (
                <a
                  href={song.sourceUrl}
                  className="underline hover:text-foreground"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {song.sourceName}
                </a>
              ) : (
                song.sourceName
              )}
            </p>
          ) : null}
          <div className="mt-3">
            <ShareButton
              title={`${song.title} lyrics`}
              text={`Read ${song.title} by ${song.artistName} on ${SITE_NAME}`}
              url={shareUrl}
            />
          </div>
        </div>
      </header>

      <div
        id="lyrics"
        className="mt-8 scroll-mt-20 border-t border-border pt-8 sm:mt-10 sm:scroll-mt-24 sm:pt-10"
      >
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Lyrics
        </h2>
        <div className="mx-auto max-w-[40rem]">
          <LyricsBlock lyrics={song.lyrics} />
          {song.lyrics?.trim() ? (
            <SuggestCorrectionForm
              songId={song.id}
              currentLyrics={song.lyrics}
            />
          ) : null}
        </div>
      </div>
      <BackToTopButton />
    </article>
  );
}
