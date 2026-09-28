/**
 * One-shot MusicBrainz metadata import for local/admin seeding.
 * Usage:
 *   npx tsx scripts/import-musicbrainz.ts
 *   npx tsx scripts/import-musicbrainz.ts "recording:adele AND artist:adele"
 *
 * Lyrics are never imported. Songs are created unpublished.
 */
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { getDb, getSqlClient } from "../src/db";
import { users } from "../src/db/schema";
import { musicBrainzSource } from "../src/services/import/sources/musicbrainz";
import { applyLyricsRightsPolicy } from "../src/services/import/lyrics-policy";
import { validateImportedRecord } from "../src/services/import/import-validation";
import {
  normalizeArtistSlug,
  normalizeSongSlug,
} from "../src/services/import/import-normalizer";
import {
  findArtistByNormalizedName,
  findSongBySourceExternal,
  findSongByTitleAndArtistName,
  insertImportJob,
  insertImportRecord,
  insertImportedSong,
  updateImportJobById,
} from "../src/repositories/imports";
import { findArtistBySlug, insertArtist } from "../src/repositories/artists";
import { findSongBySlug } from "../src/repositories/songs";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function uniqueArtistSlug(name: string): Promise<string> {
  const base = normalizeArtistSlug(name);
  let candidate = base || "artist";
  let n = 2;
  while (await findArtistBySlug(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

async function uniqueSongSlug(
  title: string,
  artistName: string,
): Promise<string> {
  const base = normalizeSongSlug(title, artistName);
  let candidate = base || "song";
  let n = 2;
  while (await findSongBySlug(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

async function main() {
  const query =
    process.argv.slice(2).join(" ").trim() ||
    "recording:hello AND artist:adele";

  const sourceUrl = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=25`;

  const [admin] = await getDb()
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.role, "ADMIN"))
    .limit(1);

  if (!admin) {
    throw new Error("No admin user found. Run npm run db:seed first.");
  }

  console.log(`Fetching MusicBrainz: ${sourceUrl}`);
  const raw = await musicBrainzSource.fetch(sourceUrl);
  const parsed = await musicBrainzSource.parse(raw, sourceUrl);
  console.log(`Parsed ${parsed.length} recordings`);

  const job = await insertImportJob({
    sourceName: musicBrainzSource.name,
    sourceUrl,
    providerId: musicBrainzSource.id,
    status: "RUNNING",
    totalRecords: parsed.length,
    createdBy: admin.id,
    previewPayload: null,
  });

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of parsed) {
    const gated = applyLyricsRightsPolicy(item, musicBrainzSource);
    const validation = validateImportedRecord(gated.record);
    if (!validation.ok) {
      failed += 1;
      await insertImportRecord({
        importJobId: job.id,
        externalId: item.externalId,
        sourceUrl,
        entityType: "SONG",
        status: "FAILED",
        title: item.title,
        artistName: item.artistName,
        errorMessage: validation.errors.join("; "),
      });
      console.log(`✗ ${item.title}: ${validation.errors.join("; ")}`);
      continue;
    }

    try {
      if (item.externalId) {
        const existingExt = await findSongBySourceExternal(
          item.sourceName,
          item.externalId,
        );
        if (existingExt) {
          skipped += 1;
          await insertImportRecord({
            importJobId: job.id,
            externalId: item.externalId,
            sourceUrl,
            entityType: "SONG",
            entityId: existingExt.id,
            status: "SKIPPED",
            title: item.title,
            artistName: item.artistName,
            errorMessage: "Already imported from MusicBrainz",
          });
          console.log(`↷ skip existing: ${item.title}`);
          continue;
        }
      }

      const existingTitle = await findSongByTitleAndArtistName(
        item.title,
        item.artistName,
      );
      if (existingTitle) {
        skipped += 1;
        await insertImportRecord({
          importJobId: job.id,
          externalId: item.externalId,
          sourceUrl,
          entityType: "SONG",
          entityId: existingTitle.id,
          status: "SKIPPED",
          title: item.title,
          artistName: item.artistName,
          errorMessage: "Song already exists",
        });
        console.log(`↷ skip duplicate: ${item.title}`);
        continue;
      }

      let artist = await findArtistByNormalizedName(item.artistName);
      if (!artist) {
        const created = await insertArtist({
          name: item.artistName,
          slug: await uniqueArtistSlug(item.artistName),
        });
        artist = {
          id: created.id,
          name: created.name,
          slug: created.slug,
        };
        await insertImportRecord({
          importJobId: job.id,
          externalId: item.externalId,
          sourceUrl,
          entityType: "ARTIST",
          entityId: created.id,
          status: "IMPORTED",
          artistName: item.artistName,
        });
        console.log(`+ artist: ${item.artistName}`);
      }

      const song = await insertImportedSong({
        title: gated.record.title,
        slug: await uniqueSongSlug(gated.record.title, gated.record.artistName),
        artistId: artist.id,
        lyrics: null,
        coverImage: null,
        albumName: gated.record.albumName ?? null,
        releaseYear: gated.record.releaseYear ?? null,
        isPublished: false,
        rightsStatus: "NOT_PROVIDED",
        sourceName: "MusicBrainz",
        sourceUrl,
        externalId: gated.record.externalId ?? null,
        importedAt: new Date(),
      });

      imported += 1;
      await insertImportRecord({
        importJobId: job.id,
        externalId: item.externalId,
        sourceUrl,
        entityType: "SONG",
        entityId: song.id,
        status: "IMPORTED",
        title: item.title,
        artistName: item.artistName,
      });
      console.log(`✓ ${item.title} — ${item.artistName}`);
    } catch (error) {
      failed += 1;
      const message =
        error instanceof Error ? error.message : "Import failed";
      await insertImportRecord({
        importJobId: job.id,
        externalId: item.externalId,
        sourceUrl,
        entityType: "SONG",
        status: "FAILED",
        title: item.title,
        artistName: item.artistName,
        errorMessage: message,
      });
      console.log(`✗ ${item.title}: ${message}`);
    }

    // MusicBrainz courtesy: stay polite between DB-heavy loops (single fetch already done)
  }

  const status =
    imported === 0 && failed > 0
      ? "FAILED"
      : failed > 0 || skipped > 0
        ? "PARTIAL"
        : "COMPLETED";

  await updateImportJobById(job.id, {
    status,
    importedRecords: imported,
    skippedRecords: skipped,
    failedRecords: failed,
    completedAt: new Date(),
  });

  console.log("\nDone");
  console.log(`Status: ${status}`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(
    "Songs are unpublished — publish them in Admin → Songs when ready.",
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getSqlClient().end({ timeout: 5 });
  });
