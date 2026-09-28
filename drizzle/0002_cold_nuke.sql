CREATE TYPE "public"."lyric_correction_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "lyric_correction_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_id" uuid NOT NULL,
	"suggested_lyrics" text NOT NULL,
	"reason" varchar(500),
	"status" "lyric_correction_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"admin_note" varchar(1000)
);
--> statement-breakpoint
ALTER TABLE "lyric_correction_requests" ADD CONSTRAINT "lyric_correction_requests_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lyric_correction_requests" ADD CONSTRAINT "lyric_correction_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lyric_corrections_song_id_idx" ON "lyric_correction_requests" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX "lyric_corrections_status_idx" ON "lyric_correction_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lyric_corrections_created_at_idx" ON "lyric_correction_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "lyric_corrections_status_created_at_idx" ON "lyric_correction_requests" USING btree ("status","created_at");