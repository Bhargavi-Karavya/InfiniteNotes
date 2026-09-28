import { SITE_NAME, absoluteUrl } from "@/lib/site";

type JsonLd = Record<string, unknown>;

export function JsonLdScript({ data }: { data: JsonLd | JsonLd[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD only — never used for lyrics/HTML content.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function songJsonLd(input: {
  title: string;
  slug: string;
  coverImage: string | null;
  artistName: string;
  artistSlug: string;
}): JsonLd[] {
  const songUrl = absoluteUrl(`/songs/${input.slug}`);
  const artistUrl = absoluteUrl(`/artists/${input.artistSlug}`);

  const musicGroup: JsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: input.artistName,
    url: artistUrl,
  };

  const recording: JsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: input.title,
    url: songUrl,
    byArtist: {
      "@type": "MusicGroup",
      name: input.artistName,
      url: artistUrl,
    },
    ...(input.coverImage ? { image: input.coverImage } : {}),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };

  return [
    musicGroup,
    recording,
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: input.artistName, path: `/artists/${input.artistSlug}` },
      { name: input.title, path: `/songs/${input.slug}` },
    ]),
  ];
}

export function artistJsonLd(input: {
  name: string;
  slug: string;
  biography: string | null;
  profileImage: string | null;
}): JsonLd[] {
  const group: JsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: input.name,
    url: absoluteUrl(`/artists/${input.slug}`),
    ...(input.profileImage ? { image: input.profileImage } : {}),
    ...(input.biography?.trim()
      ? { description: input.biography.trim().slice(0, 500) }
      : {}),
  };

  return [
    group,
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Artists", path: "/artists" },
      { name: input.name, path: `/artists/${input.slug}` },
    ]),
  ];
}
