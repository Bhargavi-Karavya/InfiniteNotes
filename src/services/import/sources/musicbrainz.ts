import type { ImportedMusicRecord, MusicDataSource } from "../types";
import { assertAllowedImportUrl, fetchApprovedJson } from "../fetch-approved";
import { assertRecordLimit } from "../import-validation";
import { MAX_IMPORT_RECORDS } from "../types";

const MUSICBRAINZ_HOSTS = ["musicbrainz.org"];

function isMusicBrainzUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.toLowerCase() === "musicbrainz.org" &&
      parsed.pathname.startsWith("/ws/2/")
    );
  } catch {
    return false;
  }
}

type MbArtistCredit = {
  name?: string;
  artist?: { name?: string; id?: string };
};

type MbRecording = {
  id?: string;
  title?: string;
  "artist-credit"?: MbArtistCredit[];
  releases?: Array<{
    title?: string;
    date?: string;
    id?: string;
  }>;
};

function artistNameFromCredit(credits: MbArtistCredit[] | undefined): string {
  if (!credits?.length) {
    return "";
  }
  return credits
    .map((c) => c.name || c.artist?.name || "")
    .filter(Boolean)
    .join(" ");
}

function mapRecording(
  recording: MbRecording,
  sourceUrl: string,
): ImportedMusicRecord | null {
  const title = recording.title?.trim();
  const artistName = artistNameFromCredit(recording["artist-credit"]).trim();
  if (!title || !artistName || !recording.id) {
    return null;
  }

  const release = recording.releases?.[0];
  const yearRaw = release?.date?.slice(0, 4);
  const releaseYear = yearRaw && /^\d{4}$/.test(yearRaw)
    ? Number(yearRaw)
    : undefined;

  return {
    title,
    artistName,
    albumName: release?.title?.trim() || undefined,
    releaseYear,
    lyrics: null,
    sourceUrl,
    sourceName: "MusicBrainz",
    externalId: recording.id,
    rightsStatus: "NOT_PROVIDED",
    metadata: {
      provider: "musicbrainz",
      recordingId: recording.id,
      releaseId: release?.id,
      attribution: "Metadata from MusicBrainz (https://musicbrainz.org)",
    },
  };
}

/**
 * MusicBrainz JSON web service — metadata only, never lyrics.
 * https://musicbrainz.org/doc/MusicBrainz_API
 */
export const musicBrainzSource: MusicDataSource = {
  id: "musicbrainz",
  name: "MusicBrainz",
  description:
    "Official MusicBrainz JSON API for recording/release metadata. Lyrics are never imported.",
  canImportMetadata: true,
  canImportLyrics: false,
  allowedHosts: MUSICBRAINZ_HOSTS,
  acceptsUrl(url) {
    return isMusicBrainzUrl(url);
  },
  async fetch(url) {
    assertAllowedImportUrl(url, MUSICBRAINZ_HOSTS);
    if (!isMusicBrainzUrl(url)) {
      throw new Error(
        "Use a MusicBrainz /ws/2/ JSON URL (include fmt=json where required).",
      );
    }

    const parsed = new URL(url);
    if (!parsed.searchParams.has("fmt")) {
      parsed.searchParams.set("fmt", "json");
    }

    return fetchApprovedJson({
      url: parsed.toString(),
      allowedHosts: MUSICBRAINZ_HOSTS,
      headers: {
        // MusicBrainz requires a descriptive User-Agent.
        "User-Agent": "InfiniteNotes/0.1 (https://infinitenotes.tech; import)",
        Accept: "application/json",
      },
    });
  },
  async parse(data, sourceUrl) {
    const records: ImportedMusicRecord[] = [];

    if (!data || typeof data !== "object") {
      throw new Error("Unsupported MusicBrainz response format.");
    }

    const payload = data as Record<string, unknown>;

    if (Array.isArray(payload.recordings)) {
      for (const item of payload.recordings) {
        const mapped = mapRecording(item as MbRecording, sourceUrl);
        if (mapped) records.push(mapped);
      }
    } else if (typeof payload.title === "string" && payload.id) {
      // Single recording resource
      const mapped = mapRecording(payload as MbRecording, sourceUrl);
      if (mapped) records.push(mapped);
    } else {
      throw new Error(
        "Unsupported MusicBrainz response. Use a recording search or recording lookup URL.",
      );
    }

    assertRecordLimit(records.length);
    return records.slice(0, MAX_IMPORT_RECORDS);
  },
};
