import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { PublicHeader } from "@/components/layout/public-header";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <>
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <footer className="mt-auto border-t border-border py-8 sm:py-10">
        <div className="page-shell flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-center sm:text-left">
            <BrandLogo />
            <p className="mt-2 text-sm font-medium text-foreground">
              {SITE_TAGLINE}
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              An intelligent music platform for discovery, lyrics, learning, and
              more — growing one feature at a time.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              © {year} {SITE_NAME}
            </p>
          </div>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground sm:justify-end"
            aria-label="Footer"
          >
            <Link href="/" className="transition-ui hover:text-foreground">
              Home
            </Link>
            <Link
              href="/lyrics"
              className="transition-ui hover:text-foreground"
            >
              Lyrics
            </Link>
            <Link
              href="/search"
              className="transition-ui hover:text-foreground"
            >
              Search
            </Link>
            <Link
              href="/artists"
              className="transition-ui hover:text-foreground"
            >
              Artists
            </Link>
            <Link
              href="/#features"
              className="transition-ui hover:text-foreground"
            >
              Features
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
