import Link from "next/link";
import { MediaImage } from "@/components/public/media-image";
import type { PublicSong } from "@/services/songs";
import { cn } from "@/lib/utils";

type SongCardProps = {
  song: PublicSong;
  layout?: "row" | "tile";
  className?: string;
};

export function SongCard({
  song,
  layout = "row",
  className,
}: SongCardProps) {
  const isTile = layout === "tile";

  return (
    <Link
      href={`/songs/${song.slug}`}
      className={cn(
        "group rounded-2xl transition-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        isTile
          ? "flex flex-col gap-3 p-1 hover:bg-surface-muted/70"
          : "flex min-h-16 items-center gap-3 p-2 hover:bg-surface-muted",
        className,
      )}
    >
      <MediaImage
        src={song.coverImage}
        alt={song.coverImage ? `${song.title} cover` : ""}
        fallbackLabel="♪"
        className={cn(
          "shrink-0 bg-surface-muted object-cover",
          isTile
            ? "aspect-square w-full rounded-xl"
            : "h-14 w-14 rounded-xl sm:h-16 sm:w-16",
        )}
      />
      <div className={cn("min-w-0", isTile && "px-1 pb-2")}>
        <p className="truncate text-sm font-semibold text-foreground group-hover:text-brand-600 sm:text-[0.95rem]">
          {song.title}
        </p>
        <p className="truncate text-xs text-muted-foreground sm:text-sm">
          {song.artistName}
        </p>
      </div>
    </Link>
  );
}
