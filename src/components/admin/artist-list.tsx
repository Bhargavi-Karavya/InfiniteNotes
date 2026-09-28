import type { ReactNode } from "react";
import Link from "next/link";
import { DeleteArtistButton } from "@/components/admin/delete-artist-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicArtistWithSongCount } from "@/services/artists";
import { cn } from "@/lib/utils";

type ArtistListProps = {
  artists: PublicArtistWithSongCount[];
  query: string;
  page: number;
  totalPages: number;
  total: number;
  error?: string | null;
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

export function ArtistList({
  artists,
  query,
  page,
  totalPages,
  total,
  error,
}: ArtistListProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Artists</h1>
          <p className="text-sm text-muted-foreground">
            Manage artists used by songs and lyrics pages.
          </p>
        </div>
        <Link href="/admin/artists/new">
          <Button type="button">Add artist</Button>
        </Link>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" method="get">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search by name or slug…"
          aria-label="Search artists"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {artists.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm font-medium">No artists found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {query
              ? "Try a different search, or clear the filter."
              : "Create your first artist to get started."}
          </p>
          {!query ? (
            <Link href="/admin/artists/new" className="mt-4 inline-block">
              <Button type="button" size="sm">
                Add artist
              </Button>
            </Link>
          ) : null}
        </div>
      ) : null}

      {artists.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground">
            Showing {artists.length} of {total} artist{total === 1 ? "" : "s"}
          </p>

          {/* Mobile cards */}
          <ul className="flex flex-col gap-3 md:hidden">
            {artists.map((artist) => (
              <li
                key={artist.id}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex gap-3">
                  <ArtistAvatar
                    name={artist.name}
                    src={artist.profileImage}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{artist.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {artist.slug}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {artist.songCount} song{artist.songCount === 1 ? "" : "s"} ·{" "}
                      {formatDate(artist.createdAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/admin/artists/${artist.id}/edit`}>
                        <Button type="button" size="sm" variant="secondary">
                          Edit
                        </Button>
                      </Link>
                      <DeleteArtistButton
                        artistId={artist.id}
                        artistName={artist.name}
                        songCount={artist.songCount}
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-muted/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Artist</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Songs</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {artists.map((artist) => (
                  <tr
                    key={artist.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ArtistAvatar
                          name={artist.name}
                          src={artist.profileImage}
                        />
                        <span className="font-medium">{artist.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {artist.slug}
                    </td>
                    <td className="px-4 py-3">{artist.songCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(artist.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/artists/${artist.id}/edit`}>
                          <Button type="button" size="sm" variant="secondary">
                            Edit
                          </Button>
                        </Link>
                        <DeleteArtistButton
                          artistId={artist.id}
                          artistName={artist.name}
                          songCount={artist.songCount}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <nav
              className="flex items-center justify-between gap-3"
              aria-label="Pagination"
            >
              <PaginationLink
                href={buildPageHref(query, page - 1)}
                disabled={page <= 1}
              >
                Previous
              </PaginationLink>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <PaginationLink
                href={buildPageHref(query, page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </PaginationLink>
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ArtistAvatar({ name, src }: { name: string; src: string | null }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover bg-surface-muted"
      />
    );
  }

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-muted-foreground"
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}

function buildPageHref(query: string, page: number): string {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const qs = params.toString();
  return qs ? `/admin/artists?${qs}` : "/admin/artists";
}

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span
        className={cn(
          "inline-flex h-9 items-center rounded-lg px-3 text-sm text-muted-foreground opacity-50",
        )}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center rounded-lg bg-surface-muted px-3 text-sm font-medium hover:bg-surface-elevated"
    >
      {children}
    </Link>
  );
}
