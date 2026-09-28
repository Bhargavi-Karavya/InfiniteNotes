import Link from "next/link";
import { AnalyticsRangePicker } from "@/components/admin/analytics-range-picker";
import { MetricCard } from "@/components/admin/metric-card";
import { ViewsOverTimeChart } from "@/components/admin/views-chart";
import { EmptyState } from "@/components/public/section-header";
import type { getAnalyticsDashboard } from "@/services/analytics";
import type { AnalyticsRange } from "@/validations/analytics";

type DashboardData = Awaited<ReturnType<typeof getAnalyticsDashboard>>;

export function AnalyticsDashboard({
  range,
  data,
}: {
  range: AnalyticsRange;
  data: DashboardData;
}) {
  const { overview, topSongs, topArtists, topSearches, viewsOverTime, recent } =
    data;
  const isEmpty = overview.totalEvents === 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Anonymous usage of InfiniteNotes public pages
          </p>
        </div>
        <AnalyticsRangePicker current={range} />
      </div>

      {isEmpty ? (
        <EmptyState
          title="No analytics yet"
          description="Analytics will appear here as people use InfiniteNotes."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              label="Total views"
              value={overview.totalViews}
              hint="Song, artist & page views"
            />
            <MetricCard label="Song views" value={overview.songViews} />
            <MetricCard label="Artist views" value={overview.artistViews} />
            <MetricCard label="Searches" value={overview.searches} />
          </div>

          <section className="surface-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold tracking-tight">
              Views over time
            </h2>
            <div className="mt-4">
              <ViewsOverTimeChart data={viewsOverTime} />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="surface-card overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold tracking-tight">
                  Top songs
                </h2>
              </div>
              {topSongs.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No song views in this range.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-surface-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">#</th>
                        <th className="px-4 py-2 font-medium">Song</th>
                        <th className="px-4 py-2 font-medium">Artist</th>
                        <th className="px-4 py-2 font-medium">Views</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {topSongs.map((song, i) => (
                        <tr key={song.songId} className="hover:bg-surface-muted/40">
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {i + 1}
                          </td>
                          <td className="px-4 py-2.5 font-medium">
                            <Link
                              href={`/admin/songs/${song.songId}/edit`}
                              className="text-brand-600 hover:underline"
                            >
                              {song.title}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {song.artistName}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                            {song.views.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="surface-card overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold tracking-tight">
                  Top artists
                </h2>
              </div>
              {topArtists.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No artist views in this range.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-surface-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">#</th>
                        <th className="px-4 py-2 font-medium">Artist</th>
                        <th className="px-4 py-2 font-medium">Views</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {topArtists.map((artist, i) => (
                        <tr
                          key={artist.artistId}
                          className="hover:bg-surface-muted/40"
                        >
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {i + 1}
                          </td>
                          <td className="px-4 py-2.5 font-medium">
                            <Link
                              href={`/admin/artists/${artist.artistId}/edit`}
                              className="text-brand-600 hover:underline"
                            >
                              {artist.name}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                            {artist.views.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="surface-card overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold tracking-tight">
                  Top searches
                </h2>
              </div>
              {topSearches.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No searches in this range.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-surface-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">Term</th>
                        <th className="px-4 py-2 font-medium">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {topSearches.map((item) => (
                        <tr key={item.query} className="hover:bg-surface-muted/40">
                          <td className="px-4 py-2.5 font-medium">{item.query}</td>
                          <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                            {item.searches.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="surface-card overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold tracking-tight">
                  Recent activity
                </h2>
              </div>
              {recent.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No recent events.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {recent.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatEventType(item.eventType)}
                        </p>
                      </div>
                      <time
                        className="shrink-0 text-xs text-muted-foreground tabular-nums"
                        dateTime={item.createdAt.toISOString()}
                      >
                        {formatRelative(item.createdAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function formatEventType(type: string): string {
  switch (type) {
    case "SONG_VIEW":
      return "Song view";
    case "ARTIST_VIEW":
      return "Artist view";
    case "SEARCH":
      return "Search";
    case "PAGE_VIEW":
      return "Page view";
    default:
      return type;
  }
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
