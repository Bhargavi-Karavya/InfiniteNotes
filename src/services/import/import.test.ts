import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertAllowedImportUrl,
  fetchApprovedJson,
  ImportFetchError,
} from "@/services/import/fetch-approved";
import {
  normalizeMatchText,
  songMatchKey,
  normalizeSongSlug,
  isAuthorizedLyricsRights,
} from "@/services/import/import-normalizer";
import {
  validateImportedRecord,
  assertRecordLimit,
} from "@/services/import/import-validation";
import { applyLyricsRightsPolicy } from "@/services/import/lyrics-policy";
import { getImportProvider, listImportProviders } from "@/services/import/sources";
import { catalogJsonSource } from "@/services/import/sources/catalog-json";
import { musicBrainzSource } from "@/services/import/sources/musicbrainz";
import type { ImportedMusicRecord } from "@/services/import/types";
import { MAX_IMPORT_RECORDS } from "@/services/import/types";

function sampleRecord(
  overrides: Partial<ImportedMusicRecord> = {},
): ImportedMusicRecord {
  return {
    title: "Tum Hi Ho",
    artistName: "Arijit Singh",
    sourceUrl: "https://musicbrainz.org/ws/2/recording/abc?fmt=json",
    sourceName: "MusicBrainz",
    rightsStatus: "NOT_PROVIDED",
    metadata: {},
    ...overrides,
  };
}

describe("import providers", () => {
  it("lists approved providers only", () => {
    const ids = listImportProviders().map((p) => p.id);
    assert.deepEqual(ids.sort(), ["catalog-json", "musicbrainz"].sort());
  });

  it("rejects unsupported provider ids", () => {
    assert.equal(getImportProvider("genius"), null);
    assert.equal(getImportProvider("any-scraper"), null);
  });

  it("accepts valid MusicBrainz URLs", () => {
    assert.equal(
      musicBrainzSource.acceptsUrl(
        "https://musicbrainz.org/ws/2/recording/?query=recording:hello&fmt=json",
      ),
      true,
    );
  });

  it("rejects invalid MusicBrainz URLs", () => {
    assert.equal(
      musicBrainzSource.acceptsUrl("https://example.com/ws/2/recording"),
      false,
    );
    assert.equal(
      musicBrainzSource.acceptsUrl("https://musicbrainz.org/recording/abc"),
      false,
    );
  });
});

describe("approved fetch URL guards", () => {
  it("allows approved https hosts", () => {
    const url = assertAllowedImportUrl(
      "https://musicbrainz.org/ws/2/recording?fmt=json",
      ["musicbrainz.org"],
    );
    assert.equal(url.hostname, "musicbrainz.org");
  });

  it("rejects unapproved hosts", () => {
    assert.throws(
      () =>
        assertAllowedImportUrl("https://evil.example/data.json", [
          "musicbrainz.org",
        ]),
      ImportFetchError,
    );
  });

  it("rejects private hosts by default", () => {
    assert.throws(
      () =>
        assertAllowedImportUrl("https://127.0.0.1/catalog.json", [
          "127.0.0.1",
        ]),
      ImportFetchError,
    );
  });

  it("rejects oversized responses", async () => {
    await assert.rejects(
      () =>
        fetchApprovedJson({
          url: "https://musicbrainz.org/ws/2/recording?fmt=json",
          allowedHosts: ["musicbrainz.org"],
          maxBytes: 10,
          fetchImpl: async () =>
            new Response('{"hello":"world-that-is-too-large"}', {
              status: 200,
              headers: { "content-type": "application/json" },
            }),
        }),
      (err: unknown) =>
        err instanceof ImportFetchError &&
        err.message.includes("too large"),
    );
  });

  it("maps timeouts to friendly errors", async () => {
    await assert.rejects(
      () =>
        fetchApprovedJson({
          url: "https://musicbrainz.org/ws/2/recording?fmt=json",
          allowedHosts: ["musicbrainz.org"],
          timeoutMs: 5,
          fetchImpl: async (_url, init) =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () => {
                const error = new Error("aborted");
                error.name = "AbortError";
                reject(error);
              });
            }),
        }),
      (err: unknown) =>
        err instanceof ImportFetchError && err.message.includes("timed out"),
    );
  });
});

describe("normalization and duplicates", () => {
  it("normalizes whitespace for matching", () => {
    assert.equal(normalizeMatchText(" Tum Hi Ho "), "tum hi ho");
    assert.equal(
      songMatchKey(" Tum Hi Ho ", "Arijit  Singh"),
      songMatchKey("Tum Hi Ho", "Arijit Singh"),
    );
  });

  it("builds stable song slugs", () => {
    assert.equal(
      normalizeSongSlug("Tum Hi Ho", "Arijit Singh"),
      "tum-hi-ho-arijit-singh",
    );
  });

  it("detects authorized lyric rights", () => {
    assert.equal(isAuthorizedLyricsRights("AUTHORIZED"), true);
    assert.equal(isAuthorizedLyricsRights("PUBLIC_DOMAIN"), true);
    assert.equal(isAuthorizedLyricsRights("PENDING_PERMISSION"), false);
  });
});

describe("validation", () => {
  it("accepts valid metadata records when rights are not required", () => {
    const result = validateImportedRecord(sampleRecord(), {
      requireRights: false,
    });
    assert.equal(result.ok, true);
  });

  it("rejects songs without rights by default", () => {
    const result = validateImportedRecord(sampleRecord());
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.errors.join(" "), /rights|permission/i);
    }
  });

  it("accepts AUTHORIZED songs when rights are required", () => {
    const result = validateImportedRecord(
      sampleRecord({ rightsStatus: "AUTHORIZED" }),
    );
    assert.equal(result.ok, true);
  });

  it("rejects invalid records", () => {
    const result = validateImportedRecord(
      sampleRecord({ title: "", artistName: "", sourceUrl: "not-a-url" }),
      { requireRights: false },
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.length >= 1);
    }
  });

  it("rejects malformed years", () => {
    const result = validateImportedRecord(
      sampleRecord({ releaseYear: 99 as number }),
      { requireRights: false },
    );
    assert.equal(result.ok, false);
  });

  it("enforces record limits", () => {
    assert.throws(() => assertRecordLimit(MAX_IMPORT_RECORDS + 1));
  });
});

describe("lyrics rights policy", () => {
  it("blocks lyrics when rights are not authorized", () => {
    const result = applyLyricsRightsPolicy(
      sampleRecord({
        lyrics: "secret lyrics",
        rightsStatus: "PENDING_PERMISSION",
      }),
      catalogJsonSource,
    );
    assert.equal(result.record.lyrics, null);
    assert.equal(result.lyricsDecision, "blocked");
    assert.equal(result.lyricsImportable, false);
  });

  it("allows authorized lyrics from lyric-capable providers", () => {
    const result = applyLyricsRightsPolicy(
      sampleRecord({
        lyrics: "public domain lines",
        rightsStatus: "AUTHORIZED",
      }),
      catalogJsonSource,
    );
    assert.equal(result.record.lyrics, "public domain lines");
    assert.equal(result.lyricsDecision, "import");
    assert.equal(result.lyricsImportable, true);
  });

  it("never imports lyrics from metadata-only providers", () => {
    const result = applyLyricsRightsPolicy(
      sampleRecord({
        lyrics: "should not import",
        rightsStatus: "AUTHORIZED",
      }),
      musicBrainzSource,
    );
    assert.equal(result.record.lyrics, null);
    assert.equal(result.lyricsDecision, "blocked");
  });
});

describe("catalog parsing", () => {
  it("parses structured catalog metadata", async () => {
    const records = await catalogJsonSource.parse(
      {
        sourceName: "Example Catalog",
        licenseNote: "AUTHORIZED for InfiniteNotes",
        records: [
          {
            title: "Demo Song",
            artistName: "Demo Artist",
            albumName: "Demo Album",
            releaseYear: 2020,
            rightsStatus: "PENDING_PERMISSION",
            lyrics: "should be stripped later by policy",
            externalId: "demo-1",
          },
        ],
      },
      "https://localhost/catalog.json",
    );
    assert.equal(records.length, 1);
    assert.equal(records[0]?.title, "Demo Song");
    assert.equal(records[0]?.rightsStatus, "PENDING_PERMISSION");
  });

  it("rejects unsupported catalog payloads", async () => {
    await assert.rejects(() =>
      catalogJsonSource.parse({ hello: "world" }, "https://localhost/x.json"),
    );
  });
});

describe("musicbrainz parsing", () => {
  it("parses recording search results as metadata without lyrics", async () => {
    const records = await musicBrainzSource.parse(
      {
        recordings: [
          {
            id: "rec-1",
            title: "Hello",
            "artist-credit": [{ name: "Adele" }],
            releases: [{ title: "Album", date: "2011-01-01", id: "rel-1" }],
          },
        ],
      },
      "https://musicbrainz.org/ws/2/recording/?query=hello&fmt=json",
    );
    assert.equal(records.length, 1);
    assert.equal(records[0]?.lyrics, null);
    assert.equal(records[0]?.rightsStatus, "NOT_PROVIDED");
    assert.equal(records[0]?.externalId, "rec-1");
    assert.equal(records[0]?.releaseYear, 2011);
  });
});

describe("preview defaults", () => {
  it("marks invalid preview rows via validation", () => {
    const invalid = validateImportedRecord(
      sampleRecord({ title: " ", artistName: "OK" }),
      { requireRights: false },
    );
    assert.equal(invalid.ok, false);
  });
});
