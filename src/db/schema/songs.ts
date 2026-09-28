import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { artists } from "./artists";

export const songRightsStatusEnum = pgEnum("song_rights_status", [
  "PENDING_PERMISSION",
  "AUTHORIZED",
  "PUBLIC_DOMAIN",
  "NOT_PROVIDED",
  "REMOVED",
]);

export const songs = pgTable(
  "songs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "restrict" }),
    lyrics: text("lyrics"),
    coverImage: text("cover_image"),
    albumName: varchar("album_name", { length: 255 }),
    releaseYear: integer("release_year"),
    isPublished: boolean("is_published").notNull().default(false),
    rightsStatus: songRightsStatusEnum("rights_status")
      .notNull()
      .default("NOT_PROVIDED"),
    sourceName: varchar("source_name", { length: 255 }),
    sourceUrl: text("source_url"),
    externalId: varchar("external_id", { length: 255 }),
    importedAt: timestamp("imported_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("songs_artist_id_idx").on(table.artistId),
    index("songs_rights_status_idx").on(table.rightsStatus),
    uniqueIndex("songs_source_external_uidx")
      .on(table.sourceName, table.externalId)
      .where(sql`${table.externalId} is not null`),
  ],
);

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
export type SongRightsStatus = (typeof songRightsStatusEnum.enumValues)[number];
