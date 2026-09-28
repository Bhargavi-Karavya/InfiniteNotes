import { z } from "zod";

export const analyticsEventTypeSchema = z.enum([
  "PAGE_VIEW",
  "SONG_VIEW",
  "ARTIST_VIEW",
  "SEARCH",
]);

export const analyticsEntityTypeSchema = z.enum([
  "SONG",
  "ARTIST",
  "SEARCH",
  "PAGE",
]);

export const trackEventSchema = z.discriminatedUnion("eventType", [
  z.object({
    eventType: z.literal("SONG_VIEW"),
    path: z.string().trim().min(1).max(512),
    entityId: z.string().uuid(),
  }),
  z.object({
    eventType: z.literal("ARTIST_VIEW"),
    path: z.string().trim().min(1).max(512),
    entityId: z.string().uuid(),
  }),
  z.object({
    eventType: z.literal("SEARCH"),
    path: z.string().trim().min(1).max(512),
    query: z.string().trim().min(1).max(200),
  }),
  z.object({
    eventType: z.literal("PAGE_VIEW"),
    path: z.string().trim().min(1).max(512),
  }),
]);

export type TrackEventInput = z.infer<typeof trackEventSchema>;

export const analyticsRangeSchema = z
  .enum(["today", "7d", "30d", "90d", "all"])
  .default("30d");

export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;

/** Normalize search terms for aggregation (trim + lowercase). */
export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
}
