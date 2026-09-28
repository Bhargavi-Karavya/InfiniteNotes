"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  bulkDeleteSongsAction,
  bulkSetSongsPublishedAction,
  setSongPublishedAction,
} from "@/app/admin/(protected)/songs/actions";
import { DeleteSongButton } from "@/components/admin/delete-song-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ArtistOption, PublicSong } from "@/services/songs";

type SongListProps = {
  songs: PublicSong[];
  artists: ArtistOption[];
  query: string;
  artistId?: string;
  published: "all" | "published" | "unpublished";
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
  }).format(value instanceof Date ? value : new Date(value));
}

export function SongList({
  songs,
  artists,
  query,
  artistId,
  published,
  page,
  totalPages,
  total,
  error,
}: SongListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [bulkPending, startBulkTransition] = useTransition();
  const [rowPending, startRowTransition] = useTransition();

  const allIds = useMemo(() => songs.map((s) => s.id), [songs]);
  const allSelected =
    songs.length > 0 && songs.every((song) => selected.has(song.id));
  const selectedCount = selected.size;

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(allIds) : new Set());
  }

  function publishOne(song: PublicSong, isPublished: boolean) {
    setActionError(null);
    setActionMessage(null);
    setPendingId(song.id);
    startRowTransition(async () => {
      const result = await setSongPublishedAction(song.id, isPublished);
      setPendingId(null);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setActionMessage(
        isPublished
          ? `Published “${song.title}”.`
          : `Unpublished “${song.title}”.`,
      );
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
      router.refresh();
    });
  }

  function bulkPublish(isPublished: boolean) {
    if (selectedCount === 0) return;
    setActionError(null);
    setActionMessage(null);
    const ids = [...selected];
    startBulkTransition(async () => {
      const result = await bulkSetSongsPublishedAction(ids, isPublished);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }

      const parts = [
        `${result.updated} ${isPublished ? "published" : "unpublished"}`,
      ];
      if (result.skipped > 0) parts.push(`${result.skipped} already set`);
      if (result.failed.length > 0) {
        parts.push(`${result.failed.length} failed`);
        setActionError(
          result.failed
            .slice(0, 5)
            .map((f) => `${f.title}: ${f.error}`)
            .join(" · "),
        );
      }
      setActionMessage(parts.join(" · "));
      setSelected(new Set());
      router.refresh();
    });
  }

  function bulkDelete() {
    if (selectedCount === 0) return;
    const confirmed = window.confirm(
      `Delete ${selectedCount} selected song${selectedCount === 1 ? "" : "s"}? This cannot be undone. Artists will not be deleted.`,
    );
    if (!confirmed) return;

    setActionError(null);
    setActionMessage(null);
    const ids = [...selected];
    startBulkTransition(async () => {
      const result = await bulkDeleteSongsAction(ids);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }

      const parts = [`${result.deleted} deleted`];
      if (result.failed.length > 0) {
        parts.push(`${result.failed.length} failed`);
        setActionError(
          result.failed
            .slice(0, 5)
            .map((f) => `${f.title}: ${f.error}`)
            .join(" · "),
        );
      }
      setActionMessage(parts.join(" · "));
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Songs</h1>
          <p className="text-sm text-muted-foreground">
            Manage songs, lyrics, and publish status. Use Publish for a quick
            public release — lyrics are required.
          </p>
        </div>
        <Link
          href="/admin/songs/new"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
        >
          Add song
        </Link>
      </div>

      <form
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_10rem_auto]"
        method="get"
      >
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search by title or artist…"
          aria-label="Search songs"
        />
        <select
          name="artistId"
          defaultValue={artistId ?? ""}
          className="flex h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
          aria-label="Filter by artist"
        >
          <option value="">All artists</option>
          {artists.map((artist) => (
            <option key={artist.id} value={artist.id}>
              {artist.name}
            </option>
          ))}
        </select>
        <select
          name="published"
          defaultValue={published}
          className="flex h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
          aria-label="Filter by publish status"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="unpublished">Unpublished</option>
        </select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {actionError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      {actionMessage ? (
        <p className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm">
          {actionMessage}
        </p>
      ) : null}

      {songs.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm font-medium">No songs found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {query || artistId || published !== "all"
              ? "Try adjusting your filters."
              : "Create your first song to get started."}
          </p>
        </div>
      ) : null}

      {songs.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={allSelected}
                onChange={(e) => toggleAll(e.target.checked)}
                aria-label="Select all songs on this page"
              />
              <span>
                {selectedCount > 0
                  ? `${selectedCount} selected`
                  : "Select songs"}
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={bulkPending || selectedCount === 0}
                onClick={() => bulkPublish(true)}
              >
                {bulkPending ? "Working…" : `Publish selected (${selectedCount})`}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={bulkPending || selectedCount === 0}
                onClick={() => bulkPublish(false)}
              >
                Unpublish selected
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={bulkPending || selectedCount === 0}
                onClick={bulkDelete}
              >
                Delete selected
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Showing {songs.length} of {total} song{total === 1 ? "" : "s"}
          </p>

          <ul className="flex flex-col gap-3 md:hidden">
            {songs.map((song) => (
              <li
                key={song.id}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0"
                    checked={selected.has(song.id)}
                    onChange={(e) => toggleOne(song.id, e.target.checked)}
                    aria-label={`Select ${song.title}`}
                  />
                  <CoverThumb title={song.title} src={song.coverImage} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{song.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {song.artistName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <StatusBadge published={song.isPublished} />
                      <span>Updated {formatDate(song.updatedAt)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PublishToggleButton
                        song={song}
                        pending={rowPending && pendingId === song.id}
                        onToggle={publishOne}
                      />
                      <Link href={`/admin/songs/${song.id}/edit`}>
                        <Button type="button" size="sm" variant="secondary">
                          Edit
                        </Button>
                      </Link>
                      <DeleteSongButton
                        songId={song.id}
                        songTitle={song.title}
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-muted/60">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-4 py-3 font-medium">Song</th>
                  <th className="px-4 py-3 font-medium">Artist</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {songs.map((song) => (
                  <tr
                    key={song.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selected.has(song.id)}
                        onChange={(e) => toggleOne(song.id, e.target.checked)}
                        aria-label={`Select ${song.title}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CoverThumb title={song.title} src={song.coverImage} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{song.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {song.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{song.artistName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge published={song.isPublished} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(song.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <PublishToggleButton
                          song={song}
                          pending={rowPending && pendingId === song.id}
                          onToggle={publishOne}
                        />
                        <Link href={`/admin/songs/${song.id}/edit`}>
                          <Button type="button" size="sm" variant="secondary">
                            Edit
                          </Button>
                        </Link>
                        <DeleteSongButton
                          songId={song.id}
                          songTitle={song.title}
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
                href={buildPageHref({
                  query,
                  artistId,
                  published,
                  page: page - 1,
                })}
                disabled={page <= 1}
              >
                Previous
              </PaginationLink>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <PaginationLink
                href={buildPageHref({
                  query,
                  artistId,
                  published,
                  page: page + 1,
                })}
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

function PublishToggleButton({
  song,
  pending,
  onToggle,
}: {
  song: PublicSong;
  pending: boolean;
  onToggle: (song: PublicSong, isPublished: boolean) => void;
}) {
  if (song.isPublished) {
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => onToggle(song, false)}
      >
        {pending ? "…" : "Unpublish"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={() => onToggle(song, true)}
      title={
        song.lyrics?.trim()
          ? "Publish this song publicly"
          : "Add lyrics before publishing"
      }
    >
      {pending ? "…" : "Publish"}
    </Button>
  );
}

function CoverThumb({ title, src }: { title: string; src: string | null }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-12 w-12 shrink-0 rounded-md object-cover bg-surface-muted"
      />
    );
  }

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface-muted text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
      aria-hidden
      title={title}
    >
      Cover
    </div>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        published
          ? "bg-brand-500/15 text-brand-600 dark:text-brand-400"
          : "bg-surface-muted text-muted-foreground",
      )}
    >
      {published ? "Published" : "Unpublished"}
    </span>
  );
}

function buildPageHref({
  query,
  artistId,
  published,
  page,
}: {
  query: string;
  artistId?: string;
  published: string;
  page: number;
}): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (artistId) params.set("artistId", artistId);
  if (published !== "all") params.set("published", published);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/songs?${qs}` : "/admin/songs";
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
      <span className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-muted-foreground opacity-50">
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
