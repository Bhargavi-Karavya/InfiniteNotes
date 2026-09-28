import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * First-party anonymous usage analytics.
 * Privacy: no emails, passwords, full IPs, or other PII.
 * Optional sessionKey is a short-lived anonymous client id for future dedupe —
 * not stored for v1 tracking payloads.
 */
export const analyticsEventTypeEnum = pgEnum("analytics_event_type", [
  "PAGE_VIEW",
  "SONG_VIEW",
  "ARTIST_VIEW",
  "SEARCH",
]);

export const analyticsEntityTypeEnum = pgEnum("analytics_entity_type", [
  "SONG",
  "ARTIST",
  "SEARCH",
  "PAGE",
]);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: analyticsEventTypeEnum("event_type").notNull(),
    path: varchar("path", { length: 512 }).notNull(),
    entityType: analyticsEntityTypeEnum("entity_type"),
    entityId: uuid("entity_id"),
    /** Free-form safe metadata (e.g. { query: "arijit" }). Never store PII. */
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("analytics_events_created_at_idx").on(table.createdAt),
    index("analytics_events_event_type_created_at_idx").on(
      table.eventType,
      table.createdAt,
    ),
    index("analytics_events_entity_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
  ],
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
