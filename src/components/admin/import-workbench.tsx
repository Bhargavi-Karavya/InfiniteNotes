"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  commitImportAction,
  previewImportAction,
} from "@/app/admin/(protected)/import/actions";
import type {
  ImportCommitResult,
  ImportPreviewResult,
  ImportSelection,
  PreviewRecord,
} from "@/services/import/types";

type ProviderOption = {
  id: string;
  name: string;
  description: string;
  canImportMetadata: boolean;
  canImportLyrics: boolean;
  allowedHosts: string[];
};

type ImportHistoryItem = {
  id: string;
  sourceName: string;
  sourceUrl: string;
  status: string;
  totalRecords: number;
  importedRecords: number;
  skippedRecords: number;
  failedRecords: number;
  createdAt: Date | string;
  completedAt: Date | string | null;
};

type ImportWorkbenchProps = {
  providers: ProviderOption[];
  history: ImportHistoryItem[];
};

const BOLLYWOOD_PRESETS = [
  { label: "Arijit Singh", query: "artist:\"Arijit Singh\"" },
  { label: "Shreya Ghoshal", query: "artist:\"Shreya Ghoshal\"" },
  { label: "A. R. Rahman", query: "artist:\"A. R. Rahman\"" },
  { label: "Kishore Kumar", query: "artist:\"Kishore Kumar\"" },
  { label: "Lata Mangeshkar", query: "artist:\"Lata Mangeshkar\"" },
  {
    label: "Tum Hi Ho",
    query: "recording:\"Tum Hi Ho\" AND artist:\"Arijit Singh\"",
  },
  {
    label: "Kesariya",
    query: "recording:Kesariya AND artist:\"Arijit Singh\"",
  },
  {
    label: "Kal Ho Naa Ho",
    query: "recording:\"Kal Ho Naa Ho\" AND artist:\"Sonu Nigam\"",
  },
] as const;

function buildMusicBrainzUrl(query: string, limit = 25): string {
  const q = query.trim();
  const params = new URLSearchParams({
    query: q,
    fmt: "json",
    limit: String(limit),
  });
  return `https://musicbrainz.org/ws/2/recording/?${params.toString()}`;
}

function defaultSelections(records: PreviewRecord[]): ImportSelection[] {
  return records.map((r) => ({
    key: r.key,
    selected: r.valid,
    artistAction:
      r.artist.status === "existing" ? "map" : ("create" as const),
    mapArtistId: r.artist.artistId,
    songAction:
      r.song.status === "existing" ? ("skip" as const) : ("create" as const),
  }));
}

function lyricsLabel(record: PreviewRecord): string {
  if (record.lyricsDecision === "import") return "Authorized";
  if (record.lyricsDecision === "blocked") return "Blocked (not authorized)";
  return "Not provided";
}

export function ImportWorkbench({ providers, history }: ImportWorkbenchProps) {
  const defaultProvider =
    providers.find((p) => p.id === "musicbrainz")?.id ?? providers[0]?.id ?? "";
  const [providerId, setProviderId] = useState(defaultProvider);
  const [songQuery, setSongQuery] = useState("Tum Hi Ho");
  const [artistQuery, setArtistQuery] = useState("Arijit Singh");
  const [sourceUrl, setSourceUrl] = useState(() =>
    buildMusicBrainzUrl(
      'recording:"Tum Hi Ho" AND artist:"Arijit Singh"',
    ),
  );
  const [showAdvancedUrl, setShowAdvancedUrl] = useState(false);
  /** Default ON: only AUTHORIZED / PUBLIC_DOMAIN songs can be imported. */
  const [requireRights, setRequireRights] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [selections, setSelections] = useState<ImportSelection[]>([]);
  const [result, setResult] = useState<ImportCommitResult | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === providerId) ?? null,
    [providers, providerId],
  );

  const isMusicBrainz = providerId === "musicbrainz";
  const selectedCount = selections.filter((s) => s.selected).length;

  function applyMusicBrainzSearch(song: string, artist: string) {
    const parts: string[] = [];
    if (song.trim()) {
      parts.push(`recording:"${song.trim()}"`);
    }
    if (artist.trim()) {
      parts.push(`artist:"${artist.trim()}"`);
    }
    const query = parts.join(" AND ") || 'artist:"Arijit Singh"';
    setSourceUrl(buildMusicBrainzUrl(query));
  }

  function applyPreset(query: string) {
    setProviderId("musicbrainz");
    setSourceUrl(buildMusicBrainzUrl(query));
    setShowAdvancedUrl(false);
    // Best-effort fill of the simple fields from common preset shapes
    const recordingMatch = query.match(/recording:"([^"]+)"/i);
    const artistMatch = query.match(/artist:"([^"]+)"/i);
    setSongQuery(recordingMatch?.[1] ?? "");
    setArtistQuery(artistMatch?.[1] ?? "");
  }

  function updateSelection(key: string, patch: Partial<ImportSelection>) {
    setSelections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    );
  }

  function selectAll(value: boolean) {
    setSelections((prev) => prev.map((s) => ({ ...s, selected: value })));
  }

  function onPreview() {
    setError(null);
    setResult(null);
    const url =
      isMusicBrainz && !showAdvancedUrl
        ? (() => {
            applyMusicBrainzSearch(songQuery, artistQuery);
            return buildMusicBrainzUrl(
              [
                songQuery.trim()
                  ? `recording:"${songQuery.trim()}"`
                  : null,
                artistQuery.trim()
                  ? `artist:"${artistQuery.trim()}"`
                  : null,
              ]
                .filter(Boolean)
                .join(" AND ") || 'artist:"Arijit Singh"',
            );
          })()
        : sourceUrl;

    if (isMusicBrainz && !showAdvancedUrl) {
      setSourceUrl(url);
    }

    startTransition(async () => {
      const res = await previewImportAction({
        providerId,
        sourceUrl: url,
        requireRights,
      });
      if (!res.ok) {
        setPreview(null);
        setSelections([]);
        setError(res.error);
        return;
      }
      setPreview(res.data);
      setSelections(defaultSelections(res.data.records));
    });
  }

  function onImport() {
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      const res = await commitImportAction({
        jobId: preview.jobId,
        selections,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data);
      setPreview(null);
      setSelections([]);
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-6">
        <h2 className="text-base font-semibold tracking-tight">Fetch source</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Import Bollywood (and other) song metadata from MusicBrainz. Lyrics
          are not included — add those later only if you have rights.
        </p>

        <div className="mt-4 grid gap-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Provider</span>
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          {selectedProvider ? (
            <div className="rounded-xl bg-surface-muted/70 px-3 py-2 text-xs text-muted-foreground">
              <p>{selectedProvider.description}</p>
              <p className="mt-1">
                Lyrics:{" "}
                {selectedProvider.canImportLyrics
                  ? "Only when rights are AUTHORIZED or PUBLIC_DOMAIN"
                  : "Never (metadata only)"}
              </p>
            </div>
          ) : null}

          <label className="flex items-start gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={requireRights}
              onChange={(e) => setRequireRights(e.target.checked)}
            />
            <span>
              <span className="font-medium">
                Only import songs with rights/permission
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Recommended. Allows{" "}
                <code className="text-[11px]">AUTHORIZED</code> or{" "}
                <code className="text-[11px]">PUBLIC_DOMAIN</code> only.
                MusicBrainz metadata has no lyric rights, so it will be blocked
                unless you uncheck this.
              </span>
            </span>
          </label>

          {isMusicBrainz ? (
            <>
              <div>
                <p className="mb-2 text-sm font-medium">
                  Bollywood quick starts
                </p>
                <div className="flex flex-wrap gap-2">
                  {BOLLYWOOD_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset.query)}
                      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-ui hover:bg-surface-muted"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {!showAdvancedUrl ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium">Song title</span>
                    <input
                      type="text"
                      value={songQuery}
                      onChange={(e) => {
                        setSongQuery(e.target.value);
                        applyMusicBrainzSearch(e.target.value, artistQuery);
                      }}
                      placeholder="e.g. Tum Hi Ho"
                      className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium">Artist</span>
                    <input
                      type="text"
                      value={artistQuery}
                      onChange={(e) => {
                        setArtistQuery(e.target.value);
                        applyMusicBrainzSearch(songQuery, e.target.value);
                      }}
                      placeholder="e.g. Arijit Singh"
                      className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                    />
                  </label>
                </div>
              ) : null}

              <button
                type="button"
                className="justify-self-start text-xs font-medium text-brand-600 hover:underline"
                onClick={() => setShowAdvancedUrl((v) => !v)}
              >
                {showAdvancedUrl
                  ? "Hide advanced URL"
                  : "Show advanced MusicBrainz URL"}
              </button>
            </>
          ) : null}

          {(showAdvancedUrl || !isMusicBrainz) && (
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Source URL</span>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://…"
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
              />
            </label>
          )}

          {isMusicBrainz && !showAdvancedUrl ? (
            <p className="break-all text-xs text-muted-foreground">
              Will fetch: {sourceUrl}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={onPreview}
              disabled={pending || !providerId || !sourceUrl.trim()}
            >
              {pending && !result ? "Fetching…" : "Fetch & preview"}
            </Button>
          </div>
        </div>

        {error ? (
          <p
            className="mt-4 rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </section>

      {result ? (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight">
            Import completed
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Total</dt>
              <dd className="text-lg font-semibold">{result.total}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Imported</dt>
              <dd className="text-lg font-semibold">{result.imported}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Skipped</dt>
              <dd className="text-lg font-semibold">{result.skipped}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Failed</dt>
              <dd className="text-lg font-semibold">{result.failed}</dd>
            </div>
          </dl>
          <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto text-sm">
            {result.details.map((d) => (
              <li
                key={d.key}
                className="rounded-lg border border-border px-3 py-2"
              >
                <p className="font-medium">
                  {d.title}{" "}
                  <span className="text-xs font-normal uppercase text-muted-foreground">
                    {d.status}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {d.artistName} — {d.message}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {preview ? (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Import preview
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Source: {preview.providerName} · {preview.total} records found
                {preview.requireRights
                  ? " · rights required"
                  : " · metadata without rights allowed"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => selectAll(true)}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => selectAll(false)}
              >
                Unselect all
              </Button>
              <Button
                type="button"
                onClick={onImport}
                disabled={pending || selectedCount === 0}
              >
                {pending ? "Importing…" : `Import selected (${selectedCount})`}
              </Button>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {preview.records.map((record) => {
              const selection = selections.find((s) => s.key === record.key);
              if (!selection) return null;
              return (
                <li
                  key={record.key}
                  className="rounded-xl border border-border bg-surface/60 p-3 sm:p-4"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={selection.selected}
                      onChange={(e) =>
                        updateSelection(record.key, {
                          selected: e.target.checked,
                        })
                      }
                      aria-label={`Select ${record.record.title}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{record.record.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Artist: {record.record.artistName}
                        {record.record.albumName
                          ? ` · Album: ${record.record.albumName}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Lyrics: {lyricsLabel(record)} · Rights:{" "}
                        {record.record.rightsStatus}
                      </p>
                      <p className="mt-1 text-xs">
                        <span
                          className={
                            record.artist.status === "new"
                              ? "text-warning"
                              : "text-success"
                          }
                        >
                          {record.artist.status === "new"
                            ? "New artist"
                            : "Existing artist"}
                        </span>
                        {" · "}
                        <span
                          className={
                            record.song.status === "existing"
                              ? "text-warning"
                              : "text-success"
                          }
                        >
                          {record.song.status === "existing"
                            ? "Existing song"
                            : "New song"}
                        </span>
                      </p>

                      {!record.valid ? (
                        <p className="mt-2 text-xs text-error" role="alert">
                          {record.errors.join(" · ")}
                        </p>
                      ) : null}

                      {record.song.status === "existing" ? (
                        <div className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
                          <p>
                            Existing title: {record.song.title}
                            {record.song.existingCoverImage
                              ? " · has cover"
                              : " · no cover"}
                          </p>
                          <label className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center">
                            <span>Song action</span>
                            <select
                              className="h-9 rounded-lg border border-border bg-surface px-2"
                              value={selection.songAction}
                              onChange={(e) =>
                                updateSelection(record.key, {
                                  songAction: e.target
                                    .value as ImportSelection["songAction"],
                                })
                              }
                            >
                              <option value="skip">Skip</option>
                              <option value="update_metadata">
                                Update permitted metadata
                              </option>
                            </select>
                          </label>
                        </div>
                      ) : null}

                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <label className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center">
                          <span>Artist action</span>
                          <select
                            className="h-9 rounded-lg border border-border bg-surface px-2"
                            value={selection.artistAction}
                            onChange={(e) =>
                              updateSelection(record.key, {
                                artistAction: e.target
                                  .value as ImportSelection["artistAction"],
                              })
                            }
                          >
                            <option value="create">Create artist</option>
                            <option value="map">Map to existing</option>
                            <option value="skip">Skip record</option>
                          </select>
                        </label>
                        {selection.artistAction === "map" ? (
                          <label className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center">
                            <span>Artist</span>
                            <select
                              className="h-9 max-w-full rounded-lg border border-border bg-surface px-2 sm:max-w-xs"
                              value={selection.mapArtistId ?? ""}
                              onChange={(e) =>
                                updateSelection(record.key, {
                                  mapArtistId: e.target.value || undefined,
                                })
                              }
                            >
                              <option value="">Select artist…</option>
                              {preview.artists.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-base font-semibold tracking-tight">
          Import history
        </h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No import jobs yet.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Counts</th>
                  <th className="px-3 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {history.map((job) => (
                  <tr key={job.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <p className="font-medium">{job.sourceName}</p>
                      <p className="max-w-xs truncate text-xs text-muted-foreground">
                        {job.sourceUrl}
                      </p>
                    </td>
                    <td className="px-3 py-2">{job.status}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {job.importedRecords} imported / {job.skippedRecords}{" "}
                      skipped / {job.failedRecords} failed
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
