import Link from "next/link";
import { MediaImage } from "@/components/public/media-image";
import type { PublicArtistWithSongCount } from "@/services/artists";
import { cn } from "@/lib/utils";

type ArtistCardProps = {
  artist: PublicArtistWithSongCount;
  className?: string;
};

export function ArtistCard({ artist, className }: ArtistCardProps) {
  const initials = artist.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Link
      href={`/artists/${artist.slug}`}
      className={cn(
        "group flex min-h-16 items-center gap-3 rounded-2xl p-2 transition-ui hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        className,
      )}
    >
      <MediaImage
        src={artist.profileImage}
        alt={artist.profileImage ? artist.name : ""}
        fallbackLabel={initials || "?"}
        className="h-14 w-14 shrink-0 rounded-full"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold group-hover:text-brand-600">
          {artist.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {artist.songCount} song{artist.songCount === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
  );
}
