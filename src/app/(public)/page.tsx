import type { Metadata } from "next";
import Link from "next/link";
import { AnalyticsBeacon } from "@/components/analytics/analytics-beacon";
import { BrandLogo } from "@/components/brand/logo";
import { ArtistCard } from "@/components/public/artist-card";
import { EmptyState, SectionHeader } from "@/components/public/section-header";
import { PublicSearchForm } from "@/components/public/search-form";
import { Reveal } from "@/components/public/reveal";
import { SongCard } from "@/components/public/song-card";
import {
  SITE_DEFAULT_TITLE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  absoluteUrl,
} from "@/lib/site";
import { getFeaturedArtists } from "@/services/artists";
import {
  getPopularPublishedSongs,
  getPublishedSongs,
} from "@/services/songs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: SITE_DEFAULT_TITLE,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: SITE_DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
    type: "website",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
};

const features = [
  {
    id: "lyrics",
    title: "Lyrics",
    description:
      "Find songs, explore artists, and read lyrics in a clean, focused experience.",
    status: "available" as const,
    href: "/lyrics",
    cta: "Explore Lyrics",
  },
  {
    id: "chords",
    title: "Chords",
    description:
      "Learn how songs are played with guitar and piano chords, diagrams, and tools built for learners.",
    status: "coming" as const,
  },
  {
    id: "learn",
    title: "Learn",
    description:
      "Turn songs into learning experiences with practice-focused tools designed to help you understand music.",
    status: "coming" as const,
  },
  {
    id: "ai",
    title: "AI",
    description:
      "Use intelligent tools to explore songs, understand music concepts, and personalize your learning journey.",
    status: "coming" as const,
  },
] as const;

const journey = [
  {
    step: "1",
    title: "Discover",
    description: "Find songs and artists.",
  },
  {
    step: "2",
    title: "Understand",
    description:
      "Explore lyrics, chords, and the details behind the music.",
  },
  {
    step: "3",
    title: "Learn",
    description: "Turn songs into practical learning experiences.",
  },
  {
    step: "4",
    title: "Play",
    description: "Use music tools to practice and improve.",
  },
  {
    step: "5",
    title: "Personalize",
    description: "Use intelligent tools to make learning more personal.",
  },
] as const;

export default async function HomePage() {
  const [songsResult, popularSongs, artists] = await Promise.all([
    getPublishedSongs({ pageSize: 8 }).catch(() => ({
      items: [] as Awaited<ReturnType<typeof getPublishedSongs>>["items"],
    })),
    getPopularPublishedSongs(6).catch(() => []),
    getFeaturedArtists(6).catch(() => []),
  ]);

  const recentSongs = songsResult.items;
  const discoverySongs =
    popularSongs.length > 0 ? popularSongs : recentSongs.slice(0, 6);
  const discoveryLabel =
    popularSongs.length > 0 ? "Popular songs" : "Recently added";

  return (
    <div className="page-shell overflow-x-hidden pb-16 pt-6 sm:pt-10">
      <AnalyticsBeacon eventType="PAGE_VIEW" path="/" />

      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-3xl bg-card px-4 py-10 shadow-[var(--shadow-soft)] sm:px-8 sm:py-14"
        aria-labelledby="hero-heading"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_70%)] sm:h-72 sm:w-72"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--secondary)_18%,transparent),transparent_70%)]"
          aria-hidden
        />

        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div>
            <p className="animate-fade-up text-sm font-medium brand-gradient-text">
              InfiniteNotes
            </p>
            <h1
              id="hero-heading"
              className="animate-fade-up animate-delay-1 mt-2 max-w-xl font-[family-name:var(--font-display)] text-[1.85rem] font-semibold leading-tight tracking-tight text-balance sm:text-4xl lg:text-[2.65rem]"
            >
              {SITE_TAGLINE}
            </h1>
            <p className="animate-fade-up animate-delay-2 mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              InfiniteNotes is an intelligent music platform built to help you
              discover songs, understand music, learn to play, and explore new
              ways to connect with the music you love.
            </p>
            <div className="animate-fade-up animate-delay-3 mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/lyrics"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-500 px-5 text-sm font-medium text-white transition-ui hover:bg-brand-600 hover:shadow-[var(--shadow-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                Explore Lyrics
              </Link>
              <a
                href="#features"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface px-5 text-sm font-medium text-foreground transition-ui hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                Explore InfiniteNotes
              </a>
            </div>
          </div>

          <div className="animate-fade-up animate-delay-2 relative mx-auto flex w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-border/80 bg-surface/70 px-6 py-10 text-center shadow-[var(--shadow-glow)] backdrop-blur-sm sm:py-12">
            <BrandLogo href={null} priority />
            <p className="mt-4 text-sm font-medium text-foreground">
              An intelligent music platform
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Discovery, learning, chords, lyrics, and AI — growing one feature
              at a time.
            </p>
            <div
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
              aria-hidden
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
              <span className="h-px w-8 bg-gradient-to-r from-primary/50 to-secondary/50" />
              <span className="h-1.5 w-1.5 rounded-full bg-secondary/70" />
              <span className="h-px w-8 bg-gradient-to-r from-secondary/50 to-accent/50" />
              <span className="h-1.5 w-1.5 rounded-full bg-accent/70" />
            </div>
          </div>
        </div>
      </section>

      {/* Brand message */}
      <Reveal className="mt-10 sm:mt-12">
        <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
          InfiniteNotes brings discovery, learning, and technology together to
          make music more understandable, playable, and personal.
        </p>
      </Reveal>

      {/* Features */}
      <section
        id="features"
        className="mt-12 scroll-mt-[4.5rem] sm:mt-16"
        aria-labelledby="features-heading"
      >
        <Reveal>
          <div className="max-w-2xl">
            <h2
              id="features-heading"
              className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl"
            >
              More than just lyrics.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Everything you need to discover, understand, and learn music —
              growing one feature at a time.
            </p>
          </div>
        </Reveal>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
          {features.map((feature, index) => {
            const card = (
              <article
                className={`surface-card flex h-full flex-col p-5 transition-ui ${
                  feature.status === "available"
                    ? "hover:shadow-[var(--shadow-glow)]"
                    : "opacity-95"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      feature.status === "available"
                        ? "bg-primary/15 text-brand-600 dark:text-brand-400"
                        : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    {feature.status === "available"
                      ? "Available now"
                      : "Coming soon"}
                  </span>
                </div>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                {feature.status === "available" && feature.href ? (
                  <span className="mt-4 text-sm font-medium text-brand-600">
                    {feature.cta} →
                  </span>
                ) : null}
              </article>
            );

            return (
              <Reveal key={feature.id} delayMs={index * 60}>
                {feature.status === "available" && feature.href ? (
                  <Link
                    href={feature.href}
                    className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  >
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Current feature: Lyrics */}
      <Reveal className="mt-12 sm:mt-16">
        <section
          className="rounded-3xl border border-border bg-card px-5 py-8 shadow-[var(--shadow-soft)] sm:px-8 sm:py-10"
          aria-labelledby="lyrics-feature-heading"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
            Available now
          </p>
          <h2
            id="lyrics-feature-heading"
            className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl"
          >
            Start with the music you love.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            Explore songs and artists, discover lyrics, and build your own
            connection with the music.
          </p>
          <Link
            href="/lyrics"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-brand-500 px-5 text-sm font-medium text-white transition-ui hover:bg-brand-600 hover:shadow-[var(--shadow-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            Explore Lyrics
          </Link>
        </section>
      </Reveal>

      {/* Vision / roadmap */}
      <section
        id="vision"
        className="mt-12 scroll-mt-[4.5rem] sm:mt-16"
        aria-labelledby="vision-heading"
      >
        <Reveal>
          <h2
            id="vision-heading"
            className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl"
          >
            Built to grow with your music journey.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Lyrics are available now. Chords, learning tools, practice, and AI
            assistance are planned next — not claimed as ready today.
          </p>
        </Reveal>

        <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {journey.map((item, index) => (
            <Reveal key={item.step} delayMs={index * 50}>
              <li className="rounded-2xl border border-border bg-surface/80 p-4">
                <span className="text-xs font-medium text-brand-600">
                  {item.step}
                </span>
                <p className="mt-1 text-sm font-semibold tracking-tight">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Lyrics discovery */}
      <section
        id="explore"
        className="mt-12 scroll-mt-[4.5rem] sm:mt-16"
        aria-labelledby="explore-heading"
      >
        <Reveal>
          <SectionHeader
            id="explore-heading"
            title="Explore songs"
            description={
              discoverySongs.length > 0
                ? `${discoveryLabel} from InfiniteNotes`
                : "Published songs will appear here"
            }
            actionHref={discoverySongs.length > 0 ? "/lyrics" : undefined}
            actionLabel="View all lyrics"
          />
        </Reveal>

        {discoverySongs.length === 0 ? (
          <EmptyState
            title="No published songs yet"
            description="When songs are published on InfiniteNotes, you’ll see them here — no filler content, just the real catalog."
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
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {discoverySongs.map((song) => (
              <SongCard key={song.id} song={song} layout="row" />
            ))}
          </div>
        )}

        {artists.length > 0 ? (
          <div className="mt-10">
            <Reveal>
              <SectionHeader
                id="artists-heading"
                title="Artists"
                description="Explore artists with published songs"
                actionHref="/artists"
              />
            </Reveal>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {artists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Search CTA */}
      <section
        id="search"
        className="mt-12 scroll-mt-[4.5rem] sm:mt-16"
        aria-labelledby="search-cta-heading"
      >
        <Reveal>
          <div className="rounded-3xl border border-border bg-card px-5 py-8 shadow-[var(--shadow-soft)] sm:px-8 sm:py-10">
            <h2
              id="search-cta-heading"
              className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl"
            >
              Looking for a song?
            </h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground sm:text-base">
              Search songs and artists and find the music you&apos;re looking
              for.
            </p>
            <div className="mt-5 max-w-xl">
              <PublicSearchForm id="home-search" />
            </div>
            <Link
              href="/search"
              className="mt-4 inline-flex text-sm font-medium text-brand-600 transition-ui hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              Search InfiniteNotes
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
