import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { songs } from "./songs";
import { users } from "./users";

export const lyricCorrectionStatusEnum = pgEnum("lyric_correction_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

/**
 * Public lyric correction suggestions — never apply lyrics until admin approval.
 * Anonymous submissions; no PII stored.
 */
export const lyricCorrectionRequests = pgTable(
  "lyric_correction_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    suggestedLyrics: text("suggested_lyrics").notNull(),
    reason: varchar("reason", { length: 500 }),
    status: lyricCorrectionStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    adminNote: varchar("admin_note", { length: 1000 }),
  },
  (table) => [
    index("lyric_corrections_song_id_idx").on(table.songId),
    index("lyric_corrections_status_idx").on(table.status),
    index("lyric_corrections_created_at_idx").on(table.createdAt),
    index("lyric_corrections_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
);

export type LyricCorrectionRequest =
  typeof lyricCorrectionRequests.$inferSelect;
export type NewLyricCorrectionRequest =
  typeof lyricCorrectionRequests.$inferInsert;
