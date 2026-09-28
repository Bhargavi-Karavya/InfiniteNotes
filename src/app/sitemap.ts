import type { MetadataRoute } from "next";
import { getPublicArtistSitemapEntries } from "@/services/artists";
import { getPublishedSongSitemapEntries } from "@/services/songs";
import { absoluteUrl, getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Public sitemap for InfiniteNotes.
 * Uses lean slug/updatedAt queries only.
 * If URL counts grow large later, split into a sitemap index of chunked sitemaps.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/lyrics"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/songs"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/artists"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/search"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  try {
    const [songs, artists] = await Promise.all([
      getPublishedSongSitemapEntries(),
      getPublicArtistSitemapEntries(),
    ]);

    for (const song of songs) {
      entries.push({
        url: `${base}/songs/${song.slug}`,
        lastModified: song.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const artist of artists) {
      entries.push({
        url: `${base}/artists/${artist.slug}`,
        lastModified: artist.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    // Sitemap still returns core URLs if the database is unavailable.
  }

  return entries;
}
