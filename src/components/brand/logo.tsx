import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string | null;
  className?: string;
  /** Compact icon-only mark for tight headers */
  variant?: "wordmark" | "icon";
  priority?: boolean;
};

/**
 * Official InfiniteNotes logo assets (cyan → violet infinity/note mark).
 * Sourced from brand assets in /public/brand.
 */
export function BrandLogo({
  href = "/",
  className,
  variant = "wordmark",
  priority = false,
}: BrandLogoProps) {
  const mark =
    variant === "icon" ? (
      <Image
        src="/brand/infinitenotes-icon.jpg"
        alt="InfiniteNotes"
        width={36}
        height={36}
        priority={priority}
        className="h-9 w-9 rounded-xl object-cover"
      />
    ) : (
      <span className="inline-flex items-center gap-2">
        <Image
          src="/brand/infinitenotes-icon.jpg"
          alt=""
          width={32}
          height={32}
          priority={priority}
          className="h-8 w-8 rounded-lg object-cover"
          aria-hidden
        />
        <span className="text-base font-semibold tracking-tight sm:text-lg">
          <span className="brand-gradient-text">InfiniteNotes</span>
        </span>
      </span>
    );

  if (!href) {
    return <span className={cn("inline-flex shrink-0", className)}>{mark}</span>;
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded-lg",
        className,
      )}
      aria-label="InfiniteNotes home"
    >
      {mark}
    </Link>
  );
}
