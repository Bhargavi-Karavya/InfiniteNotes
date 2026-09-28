import type { ImportedMusicRecord, MusicDataSource } from "./types";
import { isAuthorizedLyricsRights } from "./import-normalizer";

/**
 * Apply rights-aware lyrics policy before preview/import.
 * Unauthorized lyric text is stripped even if present in the source payload.
 */
export function applyLyricsRightsPolicy(
  record: ImportedMusicRecord,
  provider: Pick<MusicDataSource, "canImportLyrics" | "name">,
): {
  record: ImportedMusicRecord;
  lyricsImportable: boolean;
  lyricsDecision: "import" | "blocked" | "not_provided";
} {
  const hasLyrics =
    typeof record.lyrics === "string" && record.lyrics.trim().length > 0;

  if (!hasLyrics) {
    return {
      record: { ...record, lyrics: null },
      lyricsImportable: false,
      lyricsDecision: "not_provided",
    };
  }

  if (
    !provider.canImportLyrics ||
    !isAuthorizedLyricsRights(record.rightsStatus)
  ) {
    return {
      record: {
        ...record,
        lyrics: null,
        metadata: {
          ...record.metadata,
          lyricsBlockedReason: !provider.canImportLyrics
            ? `Provider ${provider.name} does not authorize lyric imports.`
            : "Lyric rights are not authorized for republication.",
        },
      },
      lyricsImportable: false,
      lyricsDecision: "blocked",
    };
  }

  return {
    record: { ...record, lyrics: record.lyrics },
    lyricsImportable: true,
    lyricsDecision: "import",
  };
}
