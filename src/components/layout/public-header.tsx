import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { PublicSearchForm } from "@/components/public/search-form";

const navItems = [
  { href: "/lyrics", label: "Lyrics" },
  { href: "/search", label: "Search" },
  { href: "/#features", label: "Features" },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="page-shell flex h-14 items-center gap-2 sm:h-16 sm:gap-4">
        <BrandLogo priority />

        <div className="mx-auto hidden min-w-0 max-w-md flex-1 md:block">
          <PublicSearchForm size="compact" />
        </div>

        <nav
          className="ml-auto flex items-center gap-0.5 sm:gap-1"
          aria-label="Primary"
        >
          <Link
            href="/lyrics"
            className="inline-flex rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-ui hover:bg-surface-muted hover:text-foreground sm:hidden"
          >
            Lyrics
          </Link>

          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hidden rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-ui hover:bg-surface-muted hover:text-foreground sm:inline-flex"
            >
              {item.label}
            </Link>
          ))}

          <Link
            href="/search"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-ui hover:bg-surface-muted md:hidden"
            aria-label="Search songs or artists"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </Link>

          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
