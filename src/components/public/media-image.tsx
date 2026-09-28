import { cn } from "@/lib/utils";

type MediaImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackLabel?: string;
};

/**
 * Renders remote/admin-provided images with a graceful fallback.
 * Uses <img> so arbitrary cover URLs work without remotePatterns config.
 */
export function MediaImage({
  src,
  alt,
  className,
  fallbackLabel = "?",
}: MediaImageProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("bg-surface-muted object-cover", className)}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-surface-muted text-sm font-semibold text-muted-foreground",
        className,
      )}
      role="img"
      aria-label={alt || fallbackLabel}
    >
      {fallbackLabel}
    </div>
  );
}
