CREATE TYPE "public"."analytics_entity_type" AS ENUM('SONG', 'ARTIST', 'SEARCH', 'PAGE');--> statement-breakpoint
CREATE TYPE "public"."analytics_event_type" AS ENUM('PAGE_VIEW', 'SONG_VIEW', 'ARTIST_VIEW', 'SEARCH');--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "analytics_event_type" NOT NULL,
	"path" varchar(512) NOT NULL,
	"entity_type" "analytics_entity_type",
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_event_type_created_at_idx" ON "analytics_events" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_entity_idx" ON "analytics_events" USING btree ("entity_type","entity_id","created_at");